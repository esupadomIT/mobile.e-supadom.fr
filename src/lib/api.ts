import { API_URL } from '@/config';
import type { Forfait, Parametre, SchoolHoliday, Stage, TypeCours } from '@/lib/pricing';
import type {
  ChatData,
  Disponibilite,
  FullUser,
  Message,
  MessagesPage,
  Partner,
  Seance,
  StudentAvailability,
  TokenResponse,
  User,
  WeeklySlots,
} from '@/types';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Appelé quand l'API répond 401 (jeton expiré) : l'AuthProvider déconnecte. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Pas de connexion. Vérifie ton accès à Internet.');
  }

  if (res.status === 401 && authToken) onUnauthorized?.();

  if (!res.ok) {
    let message = 'La demande n’a pas pu aboutir. Merci de réessayer dans quelques instants.';
    try {
      const body = await res.json();
      // L'API renvoie selon les routes { error }, { message } ou un tableau de messages (validation).
      // Exceptions Nest : { statusCode, error: 'Unauthorized', message: 'Email ou mot de passe incorrect' }
      // → le message métier est dans `message`, `error` n'est que le libellé HTTP.
      const raw = typeof body?.statusCode === 'number' ? body?.message ?? body?.error : body?.error ?? body?.message;
      if (typeof raw === 'string') message = raw;
      else if (Array.isArray(raw) && typeof raw[0] === 'string') message = raw[0];
    } catch {
      // corps non JSON : message par défaut
    }
    throw new ApiError(res.status, message);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>('/v1/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  loginWithGoogle: (idToken: string) =>
    request<TokenResponse>('/v1/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  me: () => request<User>('/v1/auth/me'),

  /** Séances de l'élève ou du prof entre deux dates (annulées exclues). */
  seances: async (user: User, from: Date, to: Date): Promise<Seance[]> => {
    const range = `startDate=${encodeURIComponent(from.toISOString())}&endDate=${encodeURIComponent(to.toISOString())}`;
    const common = `noPagination=true&excludeCancelled=true&${range}`;
    const instructor = user.role === 'INSTRUCTOR';
    const res = await request<{ data: any[] }>(
      instructor
        ? `/seance/getAllSeancesInstructorById?instructorId=${user.id}&${common}`
        : `/seance/getAllSeancesStudentById?studentId=${user.id}&${common}`,
    );
    const link = (l: unknown) => (typeof l === 'string' && /^https?:\/\//.test(l) ? l : null);
    return (res.data ?? [])
      .filter((s) => s.status !== 'CANCELLED')
      .map((s): Seance => {
        const students = (s.students ?? []) as { id: number; firstName?: string; lastName?: string }[];
        return {
          id: s.id,
          start: s.dateTime ?? s.date,
          end: s.endDate ?? null,
          subject: s.subject ?? s.matiere ?? 'Séance',
          meetLink: link(s.google_meet_link),
          withWhom: instructor
            ? students.map((st) => `${st.firstName ?? ''} ${st.lastName ? `${st.lastName[0]}.` : ''}`.trim()).join(', ') || 'Élève'
            : s.instructor?.fullName ?? `${s.instructor?.firstName ?? ''} ${s.instructor?.lastName ?? ''}`.trim(),
          partnerId: instructor ? (students.length === 1 ? students[0].id : null) : s.instructor?.id ?? null,
        };
      })
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  },

  /** Conversations (dernier message seulement) + correspondants possibles. */
  chat: () => request<ChatData>('/tchat/conversation?lite=1'),
  /** Messages échangés avec un correspondant, du plus récent au plus ancien. */
  messages: (partnerId: number, limit = 50) =>
    request<MessagesPage>(`/tchat/messages?partnerId=${partnerId}&limit=${limit}`),
  sendMessage: (receiverId: number, text: string) =>
    request<Message>('/tchat/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, text }),
    }),
  markAsRead: (conversationId: number) =>
    request<{ message: string }>('/tchat/markAsRead', {
      method: 'POST',
      body: JSON.stringify({ conversationId }),
    }),

  // Jeton Expo Push du téléphone (table DeviceToken).
  registerDevice: (token: string, platform: string) =>
    request<void>('/v1/devices', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  unregisterDevice: (token: string) =>
    request<void>(`/v1/devices/${encodeURIComponent(token)}`, { method: 'DELETE' }),
  // ─── Profil ──────────────────────────────────────────────────────────────

  /** Profil complet (matières, frais d'inscription, zone scolaire…). */
  fullUser: async () => (await request<{ user: FullUser }>('/auth/user')).user,
  updateProfile: (body: Record<string, unknown>) =>
    request<{ message: string; user: FullUser }>('/auth/update-profile', { method: 'POST', body: JSON.stringify(body) }),
  updateProfileInstructor: (body: Record<string, unknown>) =>
    request<{ message: string }>('/auth/update-profile-instructor', { method: 'POST', body: JSON.stringify(body) }),
  updatePassword: (body: { id: number; currentPassword?: string; newPassword: string; confirmNewPassword: string }) =>
    request<{ message: string }>('/auth/update-password', { method: 'POST', body: JSON.stringify(body) }),
  classes: () => request<{ id: number; nom: string; niveau?: { id: number; nom: string } }[]>('/niveau/classes'),
  matieresOfClasse: (classeId: number) =>
    request<{ id: number; nom: string }[]>('/niveau/matieres', { method: 'POST', body: JSON.stringify({ classeId }) }),
  /** Ville d'un code postal (null si inconnu). */
  cityOf: async (postalCode: string) => {
    try {
      return (await request<{ city?: string }>(`/geo?postalCode=${encodeURIComponent(postalCode)}`)).city ?? null;
    } catch {
      return null;
    }
  },
  /** Matières de la classe de l'élève, hors celles déjà dans son profil. */
  availableMatieres: (classeId: number, excludeMatiereIds: (string | number)[]) =>
    request<{ id: number; nom: string }[]>('/niveau/excludeMatiereIds', {
      method: 'POST',
      body: JSON.stringify({ classeId, excludeMatiereIds }),
    }),
  /** Ajoute des matières (par nom) au profil de l'élève. */
  addMatieres: (id: number, names: string[]) =>
    request<{ message: string; user: { id: number; matieres: { id: number; nom: string }[] } }>('/auth/update-matiere', {
      method: 'POST',
      body: JSON.stringify({ id, matieres: names }),
    }),

  // ─── Disponibilités ──────────────────────────────────────────────────────

  disponibilites: (userId: number) => request<Disponibilite[]>(`/disponibilites?userId=${userId}`),
  addDisponibilite: (startDate: string, endDate: string, isAvailable: boolean) =>
    request<Disponibilite>('/disponibilites', { method: 'POST', body: JSON.stringify({ startDate, endDate, isAvailable }) }),
  deleteDisponibilite: (id: number) => request<{ ok: true }>(`/disponibilites/${id}`, { method: 'DELETE' }),
  studentAvailability: () => request<StudentAvailability>('/student-availability'),
  saveStudentAvailability: (slots: WeeklySlots) =>
    request<{ success: boolean; generatedCount: number }>('/student-availability', { method: 'POST', body: JSON.stringify({ slots }) }),

  // ─── Recharge du compte (formules) ───────────────────────────────────────

  formule: async (classe: { id: number }) => {
    const res = await request<{
      success: boolean;
      data: { forfaits: { items: Forfait[] }; typesCours: { items: TypeCours[] }; parametres: { items: Parametre[] }; stages: { items: Stage[] } };
    }>('/formule', { method: 'POST', body: JSON.stringify({ userClasse: classe }) });
    return {
      forfaits: res.data?.forfaits?.items ?? [],
      typesCours: res.data?.typesCours?.items ?? [],
      parametres: res.data?.parametres?.items ?? [],
      stages: res.data?.stages?.items ?? [],
    };
  },
  schoolZone: async (postalCode: string) =>
    (await request<{ zone: string | null }>(`/school-zone?postalCode=${encodeURIComponent(postalCode)}`)).zone,
  schoolHolidays: async (zone: string, start: Date, end: Date) => {
    const day = (d: Date) => d.toISOString().split('T')[0];
    const res = await request<{ results: SchoolHoliday[] }>(
      `/school-holidays?start=${day(start)}&end=${day(end)}&zone=${encodeURIComponent(zone)}`,
    );
    return res.results ?? [];
  },
  /** Commande PayPal ; `approveUrl` s'ouvre dans le navigateur intégré. */
  createPaypalOrder: (body: Record<string, unknown>) =>
    request<{ id: string; status: string; approveUrl: string | null }>('/paiement/createOrder', { method: 'POST', body: JSON.stringify(body) }),
  capturePaypalFormule: (body: Record<string, unknown>) =>
    request<{ message: string }>('/paiement/captureOrderPaiementFormule', { method: 'POST', body: JSON.stringify(body) }),
  createAlmaPayment: (body: Record<string, unknown>) =>
    request<{ id: string; url: string }>('/paiement/alma/createPaymentFormule', { method: 'POST', body: JSON.stringify(body) }),
  /** Profs de l'élève (2 derniers mois), à prévenir de la recharge. */
  rechargeInstructors: async (email: string) =>
    (await request<{ instructors: Partner[] }>(`/auth/user/instructors?email=${encodeURIComponent(email)}`)).instructors ?? [],
  notifyInstructors: (orderID: string, selectedInstructors: number[], email: string) =>
    request<{ success: boolean; amount?: number | string }>('/paiement/notifyInstructors', {
      method: 'POST',
      body: JSON.stringify({ orderID, selectedInstructors, email }),
    }),
};

import { API_URL } from '@/config';
import type { TeacherRequest } from '@/lib/find-teacher';
import type { Forfait, Parametre, SchoolHoliday, Stage, TypeCours } from '@/lib/pricing';
import type {
  ChatData,
  Disponibilite,
  FullUser,
  ChildLink,
  ChildOverview,
  Message,
  MessagesPage,
  ParentOfStudent,
  ParentRelation,
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

/** Paiement enregistré (POST /api/reglements). */
export interface Reglement {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  amount: number;
  status: 'Pending' | 'Approved' | string;
  /** Référence de la transaction (colonne « Référence » du site) */
  token?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/v1/auth/signup (mêmes champs que l'inscription du site). */
export interface SignupBody {
  firstName: string;
  lastName: string;
  phone?: string;
  phoneParent?: string;
  postalCode?: string;
  city?: string;
  email: string;
  emailParent?: string;
  password: string;
  classe: number;
  classeName?: string;
  matieres: number[];
  matiereNames?: string;
}

/** POST /api/v1/auth/signup-parent : compte parent / tuteur (ses enfants sont ajoutés après connexion). */
export interface SignupParentBody {
  firstName: string;
  lastName: string;
  phone?: string;
  postalCode?: string;
  city?: string;
  email: string;
  password: string;
}

/** POST /api/v1/parent/children : profil d'un enfant créé par son parent. */
export interface DevisBody {
  name: string;
  email: string;
  phone?: string;
  classId: number;
  className?: string;
  matieres: number[];
  matieresNoms?: string[];
  besoin?: string;
}

export interface UpdateChildProfileBody {
  firstName: string;
  lastName: string;
  dob: string | null;
  phone: string | null;
  classe: number;
  matieres: number[];
}

export interface CreateChildBody {
  firstName: string;
  lastName: string;
  dob?: string;
  email?: string;
  classe: number;
  classeName?: string;
  matieres: number[];
  matiereNames?: string;
  relation: ParentRelation;
}

/** Durées de séance : identifiant stocké en base → heures (comme common/forfaits.ts du backend). */
export const DURATION_HOURS: Record<string, number> = { '3': 0.5, '1': 1, '4': 1.5, '5': 2 };

/**
 * « Prof seul » (même règle que le site, T164) : séance tranchée NON par le cron
 * et moins de 2 min passées ensemble dans la visio.
 */
function profSeul(s: { seance_effectuee?: boolean; seance_effectuee_checked_at?: string | null; seance_effectuee_details?: string | null }) {
  if (s.seance_effectuee !== false || !s.seance_effectuee_checked_at || !s.seance_effectuee_details) return false;
  try {
    const m = Number(JSON.parse(s.seance_effectuee_details)?.minutesTogether);
    return Number.isFinite(m) && m < 2;
  } catch {
    return false;
  }
}

/** Fin d'une séance à partir de l'identifiant de durée. */
function endFromDuration(start: string | undefined, duration: unknown): string | null {
  const hours = DURATION_HOURS[String(duration ?? '')];
  if (!start || !hours) return null;
  return new Date(+new Date(start) + hours * 3600_000).toISOString();
}

export class ApiError extends Error {
  /** Titre court du motif, quand l'API le fournit (ex. paiement : « Paiement refusé par votre banque »). */
  public title?: string;

  constructor(public status: number, message: string, public body?: any, title?: string) {
    super(message);
    this.title = title;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Pas de connexion. Vérifie ton accès à Internet.', undefined, 'Pas de connexion');
  }

  if (res.status === 401 && authToken) onUnauthorized?.();

  if (!res.ok) {
    let message = 'La demande n’a pas pu aboutir. Merci de réessayer dans quelques instants.';
    let body: any;
    try {
      body = await res.json();
      // L'API renvoie selon les routes { error }, { message } ou un tableau de messages (validation).
      // Exceptions Nest : { statusCode, error: 'Unauthorized', message: 'Email ou mot de passe incorrect' }
      // → le message métier est dans `message`, `error` n'est que le libellé HTTP.
      const raw = typeof body?.statusCode === 'number' ? body?.message ?? body?.error : body?.error ?? body?.message;
      if (typeof raw === 'string') message = raw;
      else if (Array.isArray(raw) && typeof raw[0] === 'string') message = raw[0];
    } catch {
      // corps non JSON : message par défaut
    }
    const title = typeof body?.title === 'string' ? body.title : undefined;
    throw new ApiError(res.status, message, body, title);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  verifyTeacher: (reference: string) => request<{ valid: boolean; teacher?: Partner & { reference: string } }>('/findTeacher/verify-id', { method: 'POST', body: JSON.stringify({ reference }) }),
  requestTeacher: (body: TeacherRequest) => request<{ success: boolean; requestId?: number; message?: string }>('/findTeacher/reservation', { method: 'POST', body: JSON.stringify(body) }),
  uploadTeacherDocument: (body: FormData) => request<{ success: boolean; files: { originalName: string; filename: string; size: number; type: string }[] }>('/findTeacher/upload', { method: 'POST', body }),
  login: (email: string, password: string) =>
    request<TokenResponse>('/v1/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  loginWithGoogle: (idToken: string) =>
    request<TokenResponse>('/v1/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  /** Lien de l'e-mail encore utilisable ? (400 INVALID_TOKEN / SOCIAL_LOGIN_ACCOUNT sinon). Ne consomme pas le jeton. */
  verifyResetToken: (token: string) =>
    request<{ valid: true; email: string }>('/v1/auth/reset-password/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  /** Nouveau mot de passe depuis l'app : renvoie l'adresse du compte pour pré-remplir la connexion. */
  resetPassword: (token: string, password: string) =>
    request<{ success: true; email: string }>('/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  /** Inscription élève depuis l'app (sans reCAPTCHA) : un e-mail d'activation est envoyé. */
  signupStudent: (body: SignupBody) =>
    request<{ message?: string }>('/v1/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  /** Inscription parent / tuteur depuis l'app : un e-mail d'activation est envoyé. */
  /** « Rappelez-moi » (écran Aide & contact) : même e-mail que le formulaire du site, sans reCAPTCHA. */
  rappel: (body: { name: string; phone: string; message?: string }) =>
    request<{ message?: string }>('/v1/contact/rappel', { method: 'POST', body: JSON.stringify(body) }),
  /** Demande de devis / cours d'essai offert (écran Aide & contact) : même traitement que le site, sans reCAPTCHA. */
  devis: (body: DevisBody) => request<{ message?: string }>('/devis/v1/submit', { method: 'POST', body: JSON.stringify(body) }),
  signupParent: (body: SignupParentBody) =>
    request<{ message?: string }>('/v1/auth/signup-parent', { method: 'POST', body: JSON.stringify(body) }),
  /** Candidature professeur (multipart, CV obligatoire) : même route que le formulaire du site. */
  postuler: (body: FormData) => request<{ success: boolean; candidatureId?: number }>('/postuler', { method: 'POST', body }),
  /** Historique des paiements de l'élève (et de son parent), du plus récent au plus ancien. */
  reglements: (email: string) =>
    request<{ paiements: Reglement[]; count: number }>('/reglements', { method: 'POST', body: JSON.stringify({ email }) }),
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
          end: s.endDate ?? endFromDuration(s.dateTime ?? s.date, s.duration),
          subject: s.subject ?? s.matiere ?? 'Séance',
          meetLink: link(s.google_meet_link),
          withWhom: instructor
            ? students.map((st) => `${st.firstName ?? ''} ${st.lastName ? `${st.lastName[0]}.` : ''}`.trim()).join(', ') || 'Élève'
            : s.instructor?.fullName ?? `${s.instructor?.firstName ?? ''} ${s.instructor?.lastName ?? ''}`.trim(),
          partnerId: instructor ? (students.length === 1 ? students[0].id : null) : s.instructor?.id ?? null,
          level: instructor
            ? (students[0] as { userClasses?: { classe?: { nom?: string } }[] } | undefined)?.userClasses?.[0]?.classe?.nom ?? null
            : Array.isArray(s.levels) && s.levels.length ? s.levels.join(', ') : null,
          status: typeof s.status === 'string' ? s.status : null,
          // Présence vérifiée par le cron Google Meet (comme le site) : null tant que non tranché.
          effectuee: s.seance_effectuee_checked_at ? s.seance_effectuee === true : null,
          profSeul: s.video_prof_seul === true || profSeul(s),
          recordLink: link(s.google_meet_record),
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
  /**
   * Réservation d'un cours par l'élève sur les disponibilités d'un prof qui le suit déjà
   * (POST /seance/v1/reserver). 409 = avertissements à confirmer (`force`), 400 type « balance » = solde insuffisant.
   */
  reserveSeance: (body: { instructorId: number; date: string; horaire: string; duration: string; force?: boolean }) =>
    request<{ success: boolean; message: string; data: { id: number; date: string; horaire: string } }>('/seance/v1/reserver', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ─── Rôle Parent / Tuteur ────────────────────────────────────────────────

  /** Enfants suivis (avec prochaine séance) et invitations en attente. */
  children: async () => (await request<{ children: ChildLink[] }>('/v1/parent/children')).children ?? [],
  createChild: (body: CreateChildBody) =>
    request<{ linkId: number; studentId: number; status: 'ACTIVE' }>('/v1/parent/children', { method: 'POST', body: JSON.stringify(body) }),
  inviteChild: (email: string, relation: ParentRelation) =>
    request<{ linkId: number; status: 'PENDING'; inviteExpiresAt: string }>('/v1/parent/children/invite', {
      method: 'POST',
      body: JSON.stringify({ email, relation }),
    }),
  childOverview: (studentId: number) => request<ChildOverview>(`/v1/parent/children/${studentId}`),
  /** « Modifier le profil de Clara » : enfant créé par le parent uniquement. */
  updateChildProfile: (studentId: number, body: UpdateChildProfileBody) =>
    request<{ studentId: number }>(`/v1/parent/children/${studentId}/profil`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateChild: (studentId: number, body: { relation?: ParentRelation; isPayer?: boolean; canBook?: boolean }) =>
    request<{ id: number }>(`/v1/parent/children/${studentId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeChild: (studentId: number) => request<{ ok: true }>(`/v1/parent/children/${studentId}`, { method: 'DELETE' }),
  /** Vue élève : parents / tuteurs qui suivent son compte (et demandes en attente). */
  myParents: async () => (await request<{ parents: ParentOfStudent[] }>('/v1/me/parents')).parents ?? [],
  answerParentInvite: (linkId: number, accept: boolean) =>
    request<{ id: number; status: string }>(`/v1/me/parents/${linkId}/${accept ? 'accept' : 'reject'}`, { method: 'POST' }),
  removeMyParent: (linkId: number) => request<{ ok: true }>(`/v1/me/parents/${linkId}`, { method: 'DELETE' }),

  rechargeInstructors: async (email: string) =>
    (await request<{ instructors: Partner[] }>(`/auth/user/instructors?email=${encodeURIComponent(email)}`)).instructors ?? [],
  notifyInstructors: (orderID: string, selectedInstructors: number[], email: string) =>
    request<{ success: boolean; amount?: number | string }>('/paiement/notifyInstructors', {
      method: 'POST',
      body: JSON.stringify({ orderID, selectedInstructors, email }),
    }),
};

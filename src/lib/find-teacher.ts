import type { Parametre, TypeCours } from '@/lib/pricing';
import { isoDay, zonedTimeToUtc } from '@/lib/tz';
import type { Disponibilite, FullUser } from '@/types';

export const FIND_TEACHER_STEPS = ['Matière', 'Votre besoin', 'Professeur', 'Disponibilités', 'Budget', 'Récapitulatif'];
export const OBJECTIVES = [
  ['comprendre_cours', 'Comprendre un cours ou une notion'],
  ['faire_exercices', 'Faire des exercices pour s’entraîner'],
  ['preparer_devoir', 'Préparer un devoir ou un contrôle'],
  ['reviser_examen', 'Réviser pour un examen ou un concours'],
  ['combler_lacunes', 'Combler des lacunes'],
  ['ameliorer_methodes', 'Améliorer sa méthode de travail'],
  ['gagner_confiance', 'Gagner en confiance dans cette matière'],
  ['maintenir_excellence', 'Maintenir un bon niveau et viser l’excellence'],
  ['accompagnement_regulier', 'Mettre en place un accompagnement régulier'],
  ['autre', 'Autre'],
] as const;
export const FEELINGS = [
  ['a_l_aise', 'Il est à l’aise pour poser des questions'],
  ['timide', 'Il est plutôt timide ou réservé'],
  ['peur_erreur', 'Il a parfois peur de se tromper'],
  ['besoin_encouragement', 'Il a besoin d’être encouragé'],
  ['autonome', 'Il est autonome'],
  ['besoin_guide', 'Il a besoin d’être davantage guidé'],
  ['depend_matiere', 'Cela dépend de la matière ou de la situation'],
] as const;
export const GENDERS = [['indifferent', 'Indifférent'], ['male', 'Professeur homme'], ['female', 'Professeure femme']] as const;

export interface TeacherFile { name: string; uploadedName: string; size: number; type: string }
export interface TeacherForm {
  matiere: string;
  objectives: string[];
  otherObjective: string;
  description: string;
  chapter: string;
  deadline: string | null;
  files: TeacherFile[];
  childFeelings: string[];
  genderPreference: string;
  hasTeacherId: string;
  teacherId: string;
  confirmedAvailability: boolean;
  budgetConfirmed: string;
}
export const INITIAL_TEACHER_FORM: TeacherForm = {
  matiere: '', objectives: [], otherObjective: '', description: '', chapter: '', deadline: null,
  files: [], childFeelings: [], genderPreference: '', hasTeacherId: '', teacherId: '',
  confirmedAvailability: false, budgetConfirmed: '',
};
export interface TeacherBudget { min: number; max: number }
export type TeacherSlot = Pick<Disponibilite, 'startDate' | 'endDate'>;

/** Même fenêtre que le site, avec les jours calculés dans le fuseau plateforme. */
export function selectTeacherSlots(data: Disponibilite[], now: Date): TeacherSlot[] {
  const [year, month, day] = isoDay(now).split('-').map(Number);
  const start = +zonedTimeToUtc(year, month, day, 0, 0);
  const end = +now + 7 * 24 * 3600_000;
  const sorted = data.filter((slot) => slot.isAvailable && +new Date(slot.startDate) >= start && +new Date(slot.startDate) <= end)
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
  const days = [...new Set(sorted.map((slot) => isoDay(new Date(slot.startDate))))].slice(0, 3);
  return sorted.filter((slot) => days.includes(isoDay(new Date(slot.startDate))))
    .map(({ startDate, endDate }) => ({ startDate, endDate }));
}

export function validateTeacherSlots(slots: TeacherSlot[], allowShort = false): string | null {
  if (slots.some((slot) => !Number.isFinite(+new Date(slot.startDate)) || !Number.isFinite(+new Date(slot.endDate)) || +new Date(slot.endDate) <= +new Date(slot.startDate))) return 'Un créneau contient des dates invalides.';
  if (new Set(slots.map((slot) => isoDay(new Date(slot.startDate)))).size < 3) return 'Ajoutez au moins 3 disponibilités sur 3 jours différents.';
  if (!allowShort && slots.some((slot) => +new Date(slot.endDate) - +new Date(slot.startDate) < 3600_000)) return 'Chaque créneau doit faire au moins 1 heure.';
  return null;
}

/** Step5Budget du site : classe exacte, types visibles, quatre heures par mois. */
export function teacherBudget(user: FullUser, types: TypeCours[], params: Parametre[]): TeacherBudget | null {
  const classe = user.userClasses?.[0]?.classe;
  const priceOf = (type: TypeCours) => Number(typeof type.price === 'object' ? type.price?.[classe?.nom ?? ''] ?? 0 : type.price ?? 0);
  const type = ['soutien_scolaire', 'cours_et_exos_avec_corriges']
    .map((value) => types.find((item) => item.value === value))
    .find((item) => item && !item.hideFor?.includes(classe?.niveau?.nom ?? '') && priceOf(item) > 0);
  if (!type) return null;
  const base = priceOf(type);
  const difference = Math.abs(Number(params.find((param) => param.value === 'majoration_prix_excellence_vs_coup_de_pouce')?.price ?? 0));
  return { min: (base - difference) * 4, max: base * 4 };
}

export interface TeacherRequest {
  studentId: number; studentName: string; niveau: string; niveauLabel: string; classeId: number;
  matieres: string[]; objet: string; files: TeacherFile[]; deadline: string | null; message: string; chapter: string;
  objectives: string[]; childFeelings: string[]; genderPreference: string; hasTeacherId: string; teacherId: string;
  confirmedAvailability: string; studentAvailabilitySlots: string; budgetConfirmed: string;
  budgetMin: number; budgetMax: number; sendToConseiller: boolean; isAbandon: boolean;
}
export function teacherRequest(user: FullUser, form: TeacherForm, slots: TeacherSlot[], budget: TeacherBudget | null, adviser = false, abandon = false): TeacherRequest {
  const classe = user.userClasses?.[0]?.classe;
  if (user.role !== 'STUDENT' || !classe || !form.matiere) throw new Error('Un profil étudiant, une classe et une matière sont requis.');
  return {
    studentId: user.id, studentName: `${user.firstName} ${user.lastName}`, niveau: classe.nom,
    niveauLabel: classe.niveau?.nom ? `${classe.niveau.nom}(${classe.nom})` : classe.nom, classeId: classe.id,
    matieres: [form.matiere], objet: 'soutien_scolaire', files: form.files, deadline: form.deadline,
    message: form.description, chapter: form.chapter,
    objectives: form.objectives.map((objective) => objective === 'autre' && form.otherObjective.trim() ? `Autre : ${form.otherObjective.trim()}` : objective),
    childFeelings: form.childFeelings, genderPreference: form.genderPreference || 'indifferent',
    hasTeacherId: form.hasTeacherId || 'no', teacherId: form.hasTeacherId === 'yes' ? form.teacherId.trim() : '',
    confirmedAvailability: form.confirmedAvailability ? 'yes' : '', studentAvailabilitySlots: JSON.stringify(slots),
    budgetConfirmed: form.budgetConfirmed, budgetMin: budget?.min ?? 0, budgetMax: budget?.max ?? 0,
    sendToConseiller: adviser, isAbandon: abandon,
  };
}

export const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv',
  'text/comma-separated-values', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'];

export function validateTeacherFiles(existing: { size: number }[], added: { name: string; size?: number; mimeType?: string }[]): string | null {
  if (existing.length + added.length > 5) return 'Maximum 5 fichiers.';
  if (added.some((file) => file.size === undefined || file.size > 10 * 1024 * 1024)) return 'Taille maximale : 10 Mo par fichier. La taille doit être connue.';
  if (existing.reduce((sum, file) => sum + file.size, 0) + added.reduce((sum, file) => sum + (file.size ?? 0), 0) > 20 * 1024 * 1024) return 'Taille totale maximale : 20 Mo.';
  if (added.some((file) => !DOCUMENT_TYPES.includes(file.mimeType ?? '') || !/\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|txt|csv|zip)$/i.test(file.name))) return 'Formats acceptés : PDF, Word, Excel, PowerPoint, JPEG, PNG, TXT, CSV et ZIP.';
  return null;
}

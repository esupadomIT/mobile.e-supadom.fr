/**
 * Règle des maquettes Figma (« Nouveau mot de passe ») : au moins 12 caractères,
 * dont une majuscule et un chiffre. Copie de admin.mobile.e-supadom.fr
 * src/common/password-reset-mobile.ts — garder les deux identiques.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_RULE = `Au moins ${PASSWORD_MIN_LENGTH} caractères, dont une majuscule et un chiffre.`;

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères, dont une majuscule et un chiffre.`;
  }
  return null;
}

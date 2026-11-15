import { Redirect } from 'expo-router';

/** Onglet « Messages » : l'appui ouvre /messages (voir _layout.tsx). Garde-fou si la route est ouverte directement. */
export default function MessagerieTab() {
  return <Redirect href="/messages" />;
}

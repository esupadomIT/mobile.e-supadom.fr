import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) return null; // Le splash commun couvre la restauration de session.

  return <Redirect href={token ? '/accueil' : '/login'} />;
}

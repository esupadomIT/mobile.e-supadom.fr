import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { INTRO_SEEN_KEY } from '@/lib/intro';

export default function Index() {
  const { token, isLoading } = useAuth();
  // Intro (maquette « Launch Screens - Intro ») : seulement au premier lancement, sans session.
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(INTRO_SEEN_KEY)
      .then((v) => active && setIntroSeen(v === '1'))
      .catch(() => active && setIntroSeen(true));
    return () => {
      active = false;
    };
  }, []);

  if (isLoading || introSeen === null) return null; // Le splash commun couvre la restauration de session.
  if (token) return <Redirect href="/accueil" />;
  return <Redirect href={introSeen ? '/login' : '/intro'} />;
}

import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColors } from '@/theme';

/**
 * Lien de retour PayPal / Alma (esupadom://paiement-retour?…).
 * Le navigateur intégré le capte et rend la main à l'écran de recharge ;
 * si le système ouvre aussi ce lien dans l'app (Android), on revient simplement en arrière.
 */
export default function PaymentReturn() {
  const c = useColors();
  useEffect(() => {
    const t = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/accueil')), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

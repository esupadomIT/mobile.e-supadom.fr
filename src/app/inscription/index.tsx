import { router } from 'expo-router';
import { View } from 'react-native';

import { RoleCard, SignupShell } from '@/components/signup';

/** Maquette Figma « 🔑 Sign up » : « S’inscrire — Je souhaite m’inscrire en tant que ». */
export default function SignupChoiceScreen() {
  return (
    <SignupShell eyebrow="VOTRE ESPACE COURS" title="S’inscrire" subtitle="Je souhaite m’inscrire en tant que">
      <View style={{ gap: 16 }}>
        <RoleCard
          icon="school-outline"
          title="Élève ou Parent"
          text="Pour progresser et réussir ses examens"
          cta="Je suis Élève ou Parent"
          tone="primary"
          onPress={() => router.push('/inscription/eleve')}
        />
        <RoleCard
          icon="person-outline"
          title="Professeur particulier"
          text="Pour partager son savoir et enseigner"
          cta="Je suis Professeur"
          tone="yellow"
          onPress={() => router.push('/inscription/professeur')}
        />
      </View>
    </SignupShell>
  );
}

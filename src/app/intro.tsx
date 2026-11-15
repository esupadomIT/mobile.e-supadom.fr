import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { markIntroSeen } from '@/lib/intro';
import { fonts, radius } from '@/theme';

/**
 * Maquette Figma « 📲 Launch Screens - Intro » : « Intro - Élève » puis « Intro Prof ».
 * Affichée une seule fois, au premier lancement, avant la connexion.
 */

const SLIDES = [
  {
    image: require('../../assets/intro/intro-eleve.jpg'),
    badge: 'Soutien scolaire d’excellence',
    title: 'Faites briller le potentiel de votre enfant.',
    text: 'Des cours particuliers sur-mesure avec les meilleurs enseignants.',
  },
  {
    image: require('../../assets/intro/intro-prof.jpg'),
    badge: 'Réseau d’excellence',
    title: 'Transmettez votre passion.',
    text: 'Enseignez selon votre rythme, en visio ou à domicile, avec une rémunération garantie.',
  },
] as const;

// Couleurs fixes : texte blanc sur photo, identiques en mode clair et sombre (comme la maquette).
const C = {
  card: 'rgba(15, 30, 50, 0.55)',
  border: 'rgba(255, 255, 255, 0.22)',
  white: '#FFFFFF',
  soft: 'rgba(255, 255, 255, 0.82)',
  badge: 'rgba(255, 255, 255, 0.16)',
  dotOff: 'rgba(255, 255, 255, 0.45)',
  primary: '#2865AB',
};

export default function IntroScreen() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  const finish = async () => {
    await markIntroSeen();
    router.replace('/login');
  };

  return (
    <ImageBackground source={slide.image} style={styles.bg} resizeMode="cover" accessibilityIgnoresInvertColors>
      <View style={styles.shade} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <View style={[styles.pill, { backgroundColor: C.badge }]}>
            <Text style={styles.pillText}>e-Supadom</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.badge, { backgroundColor: C.badge }]}>
            <Text style={styles.badgeText}>{slide.badge}</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {slide.title}
          </Text>
          <Text style={styles.text}>{slide.text}</Text>

          <View style={styles.progressRow} accessibilityLabel={`Étape ${index + 1} sur ${SLIDES.length}`}>
            {SLIDES.map((s, i) => (
              <View key={s.title} style={[styles.dot, i === index ? styles.dotOn : { backgroundColor: C.dotOff }]} />
            ))}
          </View>

          <View style={styles.actions}>
            {index > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour"
                onPress={() => setIndex(index - 1)}
                style={({ pressed }) => [styles.back, { borderColor: C.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="arrow-back" size={18} color={C.white} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => (last ? void finish() : setIndex(index + 1))}
              style={({ pressed }) => [styles.next, { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.nextText}>{last ? 'Commencer' : 'Suivant'}</Text>
              <Ionicons name="arrow-forward" size={16} color={C.white} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#152B46' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 20, 35, 0.18)' },
  safe: { flex: 1, padding: 16, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: C.white, fontFamily: fonts.bold, fontSize: 12 },
  skip: { color: C.white, fontFamily: fonts.semibold, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 24, gap: 14 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { color: C.white, fontFamily: fonts.semibold, fontSize: 12 },
  title: { color: C.white, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  text: { color: C.soft, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { height: 8, width: 8, borderRadius: 4 },
  dotOn: { width: 28, backgroundColor: C.white },
  actions: { flexDirection: 'row', gap: 12 },
  back: { width: 48, height: 48, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  next: { flex: 1, height: 48, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextText: { color: C.white, fontFamily: fonts.bold, fontSize: 15 },
});

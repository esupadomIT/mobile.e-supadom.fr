import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Prolonge le splash natif pendant la restauration de session. */
export function StartupScreen({ onReady }: { onReady: () => void }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/logo-transparent.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="e-Supadom"
          onLoadEnd={onReady}
        />
        <Text style={styles.tagline}>Ensemble, vers ta réussite.</Text>
        <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Chargement de ton espace" accessibilityState={{ busy: true }}>
          <View style={styles.track}>
            <Animated.View style={[styles.progress, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 220] }) }] }]} />
          </View>
          <Text style={styles.loadingText}>Préparation de ton espace…</Text>
        </View>
      </View>
      <View style={styles.signature}>
        <View style={styles.dot} />
        <Text style={styles.signatureText}>APPRENDRE · PROGRESSER · RÉUSSIR</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', alignItems: 'center', paddingHorizontal: 32, gap: 20 },
  logo: { width: 200, maxWidth: '100%', height: 100 },
  tagline: { color: '#152B46', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  loading: { alignItems: 'center', gap: 12, marginTop: 28 },
  track: { width: 220, height: 5, borderRadius: 3, backgroundColor: '#E7F1FF', overflow: 'hidden' },
  progress: { width: 80, height: 5, borderRadius: 3, backgroundColor: '#2F80ED' },
  loadingText: { color: '#60738B', fontSize: 13 },
  signature: { position: 'absolute', bottom: '8%', alignItems: 'center', gap: 12 },
  dot: { width: 24, height: 4, borderRadius: 2, backgroundColor: '#6EE7B7' },
  signatureText: { color: '#60738B', fontSize: 9, fontWeight: '700', letterSpacing: 1.6 },
});

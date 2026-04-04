import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

const splash = require('../../assets/hitchhiker.png');

export default function HitchhikerSplash() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    Animated.parallel([pulse(dot1, 0), pulse(dot2, 200), pulse(dot3, 400)]).start();
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
  });

  return (
    <View style={styles.container}>
      <Image source={splash} style={styles.image} resizeMode="contain" />
      <View style={styles.loaderRow}>
        <Text style={styles.loaderText}>Loading your rides</Text>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.Text key={i} style={[styles.dot, dotStyle(d)]}>•</Animated.Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', flex: 1 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 4 },
  loaderText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', letterSpacing: 0.3 },
  dot: { fontSize: 24, color: '#2563EB', lineHeight: 24 },
});

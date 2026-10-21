import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const DOTS = 3;

// Full-screen loader for app start: the logo breathes and three dots bounce.
export const BrandLoader: React.FC<{ label?: string }> = ({ label = 'Getting things ready' }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const dots = useRef(Array.from({ length: DOTS }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const bounce = Animated.loop(
      Animated.stagger(
        160,
        dots.map(d => Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(240),
        ])),
      ),
    );
    breathe.start();
    bounce.start();
    return () => { breathe.stop(); bounce.stop(); };
  }, [pulse, dots]);

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Animated.View
        style={[
          styles.logo,
          { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }] },
        ]}
      >
        <Text style={styles.logoIcon}>📱</Text>
      </Animated.View>
      <View style={styles.brandRow}>
        <Text style={styles.brandMain}>CHALA</Text>
        <Text style={styles.brandAccent}>MOB</Text>
      </View>
      <View style={styles.dots}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}
          />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },
  logo: { width: 84, height: 84, borderRadius: 26, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  logoIcon: { fontSize: 40 },
  brandRow: { flexDirection: 'row' },
  brandMain: { fontSize: 28, fontWeight: '900', color: colors.navy, letterSpacing: 1 },
  brandAccent: { fontSize: 28, fontWeight: '900', color: colors.red, letterSpacing: 1 },
  dots: { flexDirection: 'row', height: 22, alignItems: 'flex-end', marginTop: spacing.xl },
  dot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.red, marginHorizontal: 5 },
  label: { fontSize: 13, color: colors.text2, marginTop: spacing.md, fontWeight: '600' },
});

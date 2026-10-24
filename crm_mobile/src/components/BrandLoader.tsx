import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

// Full-screen loader for app start: the logo breathes while a spinner turns beneath it.
export const BrandLoader: React.FC<{ label?: string }> = ({ label = 'Getting things ready' }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [pulse]);

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
      <ActivityIndicator size="large" color={colors.red} style={styles.spinner} />
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
  spinner: { marginTop: spacing.xl },
  label: { fontSize: 13, color: colors.text2, marginTop: spacing.md, fontWeight: '600' },
});

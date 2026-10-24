import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n';
import { colors, spacing } from '../theme';

// Full-screen loader for app start: the logo breathes while a spinner turns beneath it.
export const BrandLoader: React.FC<{ label?: string }> = ({ label }) => {
  const t = useT();
  label = label ?? t('Getting things ready');
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
      <Animated.Image
        source={require('../assets/logo.png')}
        style={[
          styles.logo,
          { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }] },
        ]}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.brandRow}>
        <Text style={styles.brandMain}>Chala </Text>
        <Text style={styles.brandAccent}>Mobile</Text>
      </View>
      <ActivityIndicator size="large" color={colors.amber} style={styles.spinner} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },
  logo: { width: 84, height: 84, marginBottom: spacing.lg },
  brandRow: { flexDirection: 'row' },
  brandMain: { fontSize: 28, fontWeight: '900', color: colors.text1 },
  brandAccent: { fontSize: 28, fontWeight: '500', color: colors.amberDark },
  spinner: { marginTop: spacing.xl },
  label: { fontSize: 13, color: colors.text2, marginTop: spacing.md, fontWeight: '600' },
});

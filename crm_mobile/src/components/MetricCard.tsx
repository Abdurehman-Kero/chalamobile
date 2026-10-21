import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, tones, Tone, spacing, radius, shadow } from '../theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  // Colours the icon tile and the hint line. Leave out for a quiet, neutral tile.
  variant?: Tone;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, variant = 'neutral', hint, style }) => {
  const t = tones[variant];
  return (
    <View style={[styles.card, shadow.sm, style]}>
      <View style={[styles.iconTile, { backgroundColor: t.bg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: t.fg }]} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  iconTile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  icon: { fontSize: 19 },
  value: { fontSize: 22, fontWeight: '900', color: colors.navy },
  label: { fontSize: 13, color: colors.text2, fontWeight: '600', marginTop: 2 },
  hint: { fontSize: 12, fontWeight: '700', marginTop: 4 },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChipRow } from './ChipRow';
import { addDaysYmd, formatDay, formatDayRelative, todayYmd } from '../utils/formatDate';
import { colors, radius, spacing } from '../theme';

interface Props {
  label: string;
  value: string;                 // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  // Earliest day that can be chosen. Defaults to today.
  min?: string;
  hint?: string;
}

const QUICK = [
  { key: '0', label: 'Today', days: 0 },
  { key: '1', label: 'Tomorrow', days: 1 },
  { key: '2', label: '+2 days', days: 2 },
  { key: '3', label: '+3 days', days: 3 },
  { key: '7', label: '1 week', days: 7 },
];

// One tap for the usual choices, and − / + to step to any other day.
export const DayPicker: React.FC<Props> = ({ label, value, onChange, min, hint }) => {
  const floor = min ?? todayYmd();
  const today = todayYmd();
  const canGoBack = value > floor;

  const quickSelected = QUICK.find(q => addDaysYmd(today, q.days) === value)?.key ?? '';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.step, !canGoBack && styles.stepOff]}
          onPress={() => canGoBack && onChange(addDaysYmd(value, -1))}
          disabled={!canGoBack}
          accessibilityRole="button"
          accessibilityLabel="Earlier day"
        >
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>

        <View style={styles.center} accessibilityLiveRegion="polite">
          <Text style={styles.relative}>{formatDayRelative(value)}</Text>
          <Text style={styles.date}>{formatDay(value)}</Text>
        </View>

        <TouchableOpacity
          style={styles.step}
          onPress={() => onChange(addDaysYmd(value, 1))}
          accessibilityRole="button"
          accessibilityLabel="Later day"
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>

      <ChipRow
        variant="form"
        items={QUICK.map(q => ({ key: q.key, label: q.label }))}
        selected={quickSelected}
        onSelect={(k) => onChange(addDaysYmd(today, QUICK.find(q => q.key === k)!.days))}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginBottom: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.md,
  },
  step: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  stepOff: { opacity: 0.35 },
  stepText: { fontSize: 26, fontWeight: '700', color: colors.navy, marginTop: -2 },
  center: { flex: 1, alignItems: 'center' },
  relative: { fontSize: 20, fontWeight: '900', color: colors.navy },
  date: { fontSize: 13, color: colors.text2, marginTop: 2, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.text3, marginTop: -4, marginBottom: spacing.md },
});

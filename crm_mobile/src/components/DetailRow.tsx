import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  value?: string | null;
  last?: boolean;
}

// Read-only "label: value" line for detail sheets (instead of disabled inputs).
export const DetailRow: React.FC<Props> = ({ label, value, last }) => (
  <View style={[styles.row, last && styles.last]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: { paddingVertical: 11, borderBottomWidth: 1, borderColor: colors.border },
  last: { borderBottomWidth: 0 },
  label: { fontSize: 12, fontWeight: '700', color: colors.text3, letterSpacing: 0.4, textTransform: 'uppercase' },
  value: { fontSize: 15, color: colors.navy, fontWeight: '600', marginTop: 3 },
});

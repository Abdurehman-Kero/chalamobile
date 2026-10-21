import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const CHIP_H = 36;

export interface ChipItem {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  items: ChipItem[];
  selected: string;
  onSelect: (key: string) => void;
  // Light chips on a white bar (filters) or compact chips inside a form.
  variant?: 'bar' | 'form';
}

export const ChipRow: React.FC<Props> = ({ items, selected, onSelect, variant = 'bar' }) => (
  <View style={variant === 'bar' ? styles.bar : styles.form}>
    <ScrollView
      horizontal
      style={styles.scroller}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={variant === 'bar' ? styles.barContent : styles.formContent}
    >
      {items.map((it) => {
        const active = it.key === selected;
        return (
          <TouchableOpacity
            key={it.key}
            onPress={() => onSelect(it.key)}
            activeOpacity={0.8}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]}>{it.label}</Text>
            {it.count !== undefined && (
              <View style={[styles.count, active && styles.countActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{it.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  // flexGrow 0 keeps the row exactly as tall as its chips; the content then
  // scrolls sideways instead of being clipped.
  scroller: { flexGrow: 0, height: CHIP_H + 4 },
  barContent: { paddingHorizontal: spacing.lg, alignItems: 'center' },
  formContent: { alignItems: 'center' },
  form: { marginBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CHIP_H,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  text: { fontSize: 13, fontWeight: '700', color: colors.text2 },
  textActive: { color: colors.white },
  count: {
    minWidth: 20, height: 20, borderRadius: 10, marginLeft: 8, paddingHorizontal: 6,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  countActive: { backgroundColor: colors.onNavyChip },
  countText: { fontSize: 11, fontWeight: '800', color: colors.text2 },
  countTextActive: { color: colors.white },
});

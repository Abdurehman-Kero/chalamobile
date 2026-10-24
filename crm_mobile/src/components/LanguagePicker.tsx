import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LANGS, useLang } from '../i18n';
import { colors, radius, spacing } from '../theme';

interface Props {
  // 'pill' is the small toggle for the sign-in screen, 'list' the full rows for the profile page.
  variant?: 'pill' | 'list';
}

export const LanguagePicker: React.FC<Props> = ({ variant = 'list' }) => {
  const lang = useLang(s => s.lang);
  const setLang = useLang(s => s.setLang);

  if (variant === 'pill') {
    return (
      <View style={styles.pills} accessibilityRole="radiogroup">
        {LANGS.map(l => {
          const active = l.code === lang;
          return (
            <TouchableOpacity
              key={l.code}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setLang(l.code)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={l.name}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{l.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup">
      {LANGS.map((l, i) => {
        const active = l.code === lang;
        return (
          <TouchableOpacity
            key={l.code}
            style={[styles.row, i === LANGS.length - 1 && styles.rowLast]}
            onPress={() => setLang(l.code)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.name, active && styles.nameActive]}>{l.name}</Text>
            <View style={[styles.radio, active && styles.radioOn]}>{active && <View style={styles.dot} />}</View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', alignSelf: 'flex-end', backgroundColor: colors.white, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, padding: 3 },
  pill: { minWidth: 44, minHeight: 34, paddingHorizontal: 12, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.navy },
  pillText: { fontSize: 13, fontWeight: '800', color: colors.text2 },
  pillTextActive: { color: colors.white },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderBottomWidth: 1, borderColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text1 },
  nameActive: { fontWeight: '800' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.md },
  radioOn: { borderColor: colors.red },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
});

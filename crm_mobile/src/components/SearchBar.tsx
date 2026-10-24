import React, { useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useFormScroll } from './FormModal';
import { useT } from '../i18n';
import { colors, radius, spacing } from '../theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const SearchBar: React.FC<Props> = ({ value, onChangeText, placeholder, style }) => {
  const t = useT();
  placeholder = placeholder ?? t('Search…');
  const wrapRef = useRef<any>(null);
  const formScroll = useFormScroll();
  return (
  <View ref={wrapRef} collapsable={false} style={[styles.wrap, style]}>
    <Text style={styles.icon}>🔍</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text3}
      autoCorrect={false}
      returnKeyType="search"
      onFocus={() => formScroll?.reveal(wrapRef.current)}
      accessibilityLabel={placeholder}
    />
    {value ? (
      <TouchableOpacity
        onPress={() => onChangeText('')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel={t('Clear search')}
      >
        <Text style={styles.clear}>✕</Text>
      </TouchableOpacity>
    ) : null}
  </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  icon: { fontSize: 15, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: colors.navy, paddingVertical: 10 },
  clear: { fontSize: 16, color: colors.text3, paddingLeft: 8 },
});

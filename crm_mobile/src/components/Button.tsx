import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

const palette = {
  primary:   { bg: colors.red,     fg: colors.white,  border: colors.red },
  dark:      { bg: colors.navy,    fg: colors.white,  border: colors.navy },
  secondary: { bg: colors.white,   fg: colors.navy,   border: colors.border2 },
  ghost:     { bg: colors.transparent, fg: colors.red, border: colors.transparent },
  danger:    { bg: colors.redSoft, fg: colors.redDark, border: colors.redBorder },
};

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', size = 'md', loading, disabled, icon, style,
}) => {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: p.bg, borderColor: p.border },
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        <Text style={[styles.text, size === 'sm' && styles.textSm, { color: p.fg }]} numberOfLines={1}>
          {icon ? `${icon}  ` : ''}{title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  md: { minHeight: 50 },
  sm: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.full },
  inactive: { opacity: 0.55 },
  text: { fontSize: 15, fontWeight: '800' },
  textSm: { fontSize: 13, fontWeight: '700' },
});

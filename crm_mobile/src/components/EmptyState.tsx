import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { useT } from '../i18n';
import { colors, spacing } from '../theme';

interface Props {
  emoji: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({ emoji, title, message, actionLabel, onAction }) => (
  <View style={styles.wrap}>
    <View style={styles.circle}><Text style={styles.emoji}>{emoji}</Text></View>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} size="sm" style={styles.action} /> : null}
  </View>
);

// A spinner with a short label. After a few seconds a calm note says it is taking a little longer
// than usual, so the screen never looks frozen. `variant` is kept so existing screens still compile.
export const LoadingState: React.FC<{ label?: string; variant?: 'list' | 'home' }> = ({ label }) => {
  const t = useT();
  label = label ?? t('Loading…');
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.red} />
      <Text style={styles.loadingLabel}>{label}</Text>
      {slow ? <Text style={styles.loadingSlow}>{t('This is taking a little longer than usual. Thanks for your patience.')}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 56, paddingHorizontal: spacing['3xl'] },
  circle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  emoji: { fontSize: 34 },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy, marginTop: spacing.lg, textAlign: 'center' },
  message: { fontSize: 14, color: colors.text2, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  action: { marginTop: spacing.lg },
  loading: { alignItems: 'center', justifyContent: 'center', paddingTop: 72, paddingBottom: 48, paddingHorizontal: spacing['3xl'] },
  loadingLabel: { fontSize: 14, fontWeight: '600', color: colors.text2, marginTop: spacing.md, textAlign: 'center' },
  loadingSlow: { fontSize: 13, color: colors.text3, marginTop: spacing.sm, textAlign: 'center', lineHeight: 18 },
});

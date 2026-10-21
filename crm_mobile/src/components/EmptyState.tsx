import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HomeSkeleton, ListSkeleton } from './Skeleton';
import { Button } from './Button';
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

// Grey placeholders shaped like the content that is about to appear.
// `home` suits dashboards and reports, `list` suits the card lists.
export const LoadingState: React.FC<{ label?: string; variant?: 'list' | 'home' }> = ({ label = 'Loading…', variant = 'list' }) => (
  <View accessibilityLabel={label} accessibilityLiveRegion="polite">
    {variant === 'home' ? <HomeSkeleton /> : <ListSkeleton />}
  </View>
);

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
});

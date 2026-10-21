import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  message: string;
  onRetry?: () => void;
}

// Shown above a list when a refresh failed but older data is still on screen.
export const InlineNotice: React.FC<Props> = ({ message, onRetry }) => (
  <View style={styles.wrap} accessibilityRole="alert">
    <Text style={styles.icon}>⚠️</Text>
    <Text style={styles.text}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity onPress={onRetry} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.retry}>Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amberSoft,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icon: { fontSize: 14, marginRight: 8 },
  text: { flex: 1, fontSize: 13, color: colors.amberDark, fontWeight: '600' },
  retry: { fontSize: 13, fontWeight: '800', color: colors.red, marginLeft: 10 },
});

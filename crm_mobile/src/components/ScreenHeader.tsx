import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, layout } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const ScreenHeader: React.FC<Props> = ({ title, subtitle, right }) => (
  <View style={styles.header}>
    <View style={styles.titles}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    {right ? <View style={styles.right}>{right}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenX,
    paddingTop: layout.topGap + spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  titles: { flex: 1, marginRight: spacing.md },
  title: { fontSize: 22, fontWeight: '900', color: colors.navy },
  sub: { fontSize: 13, color: colors.text2, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center' },
});

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

// One shared pulse so every placeholder on screen breathes in sync.
function usePulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
}

interface BlockProps {
  width?: number | `${number}%`;
  height?: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
  opacity: Animated.AnimatedInterpolation<number>;
}

const Block: React.FC<BlockProps> = ({ width = '100%', height = 14, round = 8, style, opacity }) => (
  <Animated.View style={[{ width, height, borderRadius: round, backgroundColor: colors.border, opacity }, style]} />
);

// Grey placeholder rows shaped like the real list cards.
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  const opacity = usePulse();
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Block width={48} height={48} round={14} opacity={opacity} />
          <View style={styles.lines}>
            <Block width="62%" height={15} opacity={opacity} />
            <Block width="40%" height={12} opacity={opacity} style={styles.gap} />
            <Block width={86} height={22} round={11} opacity={opacity} style={styles.gap} />
          </View>
          <Block width={64} height={16} opacity={opacity} />
        </View>
      ))}
    </View>
  );
};

// Placeholder for Home and the report: a big card, a pair of tiles, a chart.
export const HomeSkeleton: React.FC = () => {
  const opacity = usePulse();
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Block height={170} round={radius.lg} opacity={opacity} style={styles.section} />
      <View style={styles.pair}>
        <Block height={84} round={radius.md} opacity={opacity} style={styles.half} />
        <Block height={84} round={radius.md} opacity={opacity} style={styles.half} />
      </View>
      <Block height={190} round={radius.md} opacity={opacity} style={styles.section} />
      <Block width="40%" height={18} opacity={opacity} style={styles.section} />
      <Block height={64} round={radius.md} opacity={opacity} style={styles.row} />
      <Block height={64} round={radius.md} opacity={opacity} style={styles.row} />
    </View>
  );
};

const styles = StyleSheet.create({
  list: { paddingTop: spacing.xs },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md,
  },
  lines: { flex: 1, marginHorizontal: spacing.md },
  gap: { marginTop: 8 },
  section: { marginBottom: spacing.md },
  pair: { flexDirection: 'row', marginBottom: spacing.md },
  half: { flex: 1, width: undefined, marginRight: spacing.md },
  row: { marginBottom: spacing.sm },
});

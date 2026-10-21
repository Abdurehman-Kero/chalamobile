import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  active: boolean;
}

const BAR_W = 0.35; // the moving segment, as a share of the width

// A thin bar under the header that sweeps while the screen refreshes its data
// in the background, so it is clear the numbers are being updated.
export const TopLoader: React.FC<Props> = ({ active }) => {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: active ? 1 : 0, duration: active ? 120 : 260, useNativeDriver: true }).start();
  }, [active, fade]);

  useEffect(() => {
    if (!active || !width) return;
    x.setValue(-width * BAR_W);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: width, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, width, x]);

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} pointerEvents="none">
      <Animated.View style={[styles.fill, { width: width * BAR_W, opacity: fade, transform: [{ translateX: x }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { height: 3, overflow: 'hidden', backgroundColor: colors.transparent },
  fill: { height: 3, borderRadius: 2, backgroundColor: colors.red },
});

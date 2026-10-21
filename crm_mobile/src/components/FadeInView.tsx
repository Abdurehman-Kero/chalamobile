import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  // Stagger: rows further down the list start a little later.
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

// Fades and lifts its content into place once, when it first appears.
export const FadeInView: React.FC<Props> = ({ children, delay = 0, style }) => {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);

  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
};

// Only the first screenful is staggered; rows scrolled in later appear at once.
export const rowDelay = (index: number) => (index < 8 ? index * 45 : 0);

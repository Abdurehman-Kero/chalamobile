import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../store/toastStore';
import { colors, radius, shadow } from '../theme';

const BG = { success: colors.greenDark, error: colors.redDark, info: colors.navy };
const ICON = { success: '✓', error: '!', info: 'i' };

// Mount once near the app root. Shows the latest toast for a few seconds.
export const ToastHost: React.FC = () => {
  const { id, message, type, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
        if (finished) hide();
      });
    }, type === 'error' ? 4500 : 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        shadow.md,
        {
          top: insets.top + 12,
          backgroundColor: BG[type],
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        },
      ]}
    >
      <Text style={styles.icon}>{ICON[type]}</Text>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    zIndex: 1000,
  },
  icon: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.onNavyChip,
    color: colors.white, textAlign: 'center', lineHeight: 22, fontSize: 13, fontWeight: '900', marginRight: 10, overflow: 'hidden',
  },
  text: { flex: 1, color: colors.white, fontSize: 14, fontWeight: '700' },
});

import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // Pinned at the bottom of the card, below the scrolling content.
  footer?: React.ReactNode;
}

const SCREEN_H = Dimensions.get('window').height;

function Dialog({ onClose, title, children, footer }: Omit<Props, 'visible'>) {
  const insets = useSafeAreaInsets();
  // The card scales up from slightly smaller as it fades in.
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pop, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [pop]);
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={[
          styles.card, shadow.md, { maxHeight: SCREEN_H * 0.82 },
          { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title || ''}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.close}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={footer ? undefined : styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

// A dialog in the middle of the screen, for details, receipts and menus.
// Anything with text inputs belongs in FormModal instead.
export const CenterModal: React.FC<Props> = ({ visible, ...rest }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={rest.onClose} statusBarTranslucent navigationBarTranslucent>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Dialog {...rest} />
    </SafeAreaProvider>
  </Modal>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingTop: spacing.xl,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  title: { flex: 1, fontSize: 19, fontWeight: '900', color: colors.navy, marginRight: spacing.md },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 14, fontWeight: '700', color: colors.text2 },
  scroll: { flexGrow: 0, paddingHorizontal: spacing.xl },
  scrollContent: { paddingBottom: spacing.xl },
  footer: { padding: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.border },
});

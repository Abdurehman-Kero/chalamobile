import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { colors, layout, spacing } from '../theme';

// Inputs call reveal() when focused so the form scrolls them to the top of the
// visible area, above the keyboard.
interface FormScroll { reveal: (node: any) => void }
const FormScrollContext = createContext<FormScroll | null>(null);
export const useFormScroll = () => useContext(FormScrollContext);

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  // Pinned under the form and lifted above the keyboard (usually the Save button).
  footer?: React.ReactNode;
}

function FormPage({ onClose, title, subtitle, children, footer }: Omit<Props, 'visible'>) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<any>(null);
  const contentRef = useRef<any>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const reveal = useCallback((node: any) => {
    // Wait for the keyboard animation so the visible area has its final size.
    setTimeout(() => {
      if (!node || !contentRef.current) return;
      node.measureLayout(
        contentRef.current,
        (_x: number, y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true }),
        () => {},
      );
    }, 280);
  }, []);

  const ctx = useMemo(() => ({ reveal }), [reveal]);

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + layout.topGap }]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.close}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: keyboardOpen ? 280 : layout.bottomGap }]}
        >
          <View ref={contentRef} collapsable={false}>
            <FormScrollContext.Provider value={ctx}>{children}</FormScrollContext.Provider>
          </View>
        </ScrollView>

        {footer ? (
          <View style={[styles.footer, { paddingBottom: keyboardOpen ? spacing.md : Math.max(insets.bottom, spacing.md) + spacing.xs }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export const FormModal: React.FC<Props> = ({ visible, ...rest }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={rest.onClose} statusBarTranslucent navigationBarTranslucent>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <FormPage {...rest} />
    </SafeAreaProvider>
  </Modal>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenX,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  close: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard2,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  closeIcon: { fontSize: 16, fontWeight: '700', color: colors.text2 },
  titles: { flex: 1 },
  title: { fontSize: 20, fontWeight: '900', color: colors.navy },
  subtitle: { fontSize: 13, color: colors.text2, marginTop: 1 },
  content: { paddingHorizontal: layout.screenX, paddingTop: spacing.xl },
  footer: {
    paddingHorizontal: layout.screenX,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
});

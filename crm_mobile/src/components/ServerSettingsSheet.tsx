import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormModal } from './FormModal';
import { Button } from './Button';
import { ChipRow } from './ChipRow';
import { FormInput } from './FormInput';
import {
  DEFAULT_BASE_URL, EMULATOR_URL, PRODUCTION_URL, USB_URL,
  getApiBaseUrl, normalizeBaseUrl, resetApiBaseUrl, setApiBaseUrl, testConnection,
} from '../api/axios';
import { toast } from '../store/toastStore';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: (url: string) => void;
}

// Staff only ever need the live server. The local addresses are for developers.
const PRESETS = __DEV__
  ? [
      { key: PRODUCTION_URL, label: 'Live server' },
      { key: EMULATOR_URL, label: 'Android emulator' },
      { key: USB_URL, label: 'USB cable (adb reverse)' },
    ]
  : [{ key: PRODUCTION_URL, label: 'Live server' }];

export const ServerSettingsSheet: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (visible) { setUrl(getApiBaseUrl()); setResult(null); }
  }, [visible]);

  const test = async () => {
    if (!url.trim()) { setResult({ ok: false, text: 'Enter the server address first.' }); return; }
    setTesting(true);
    setResult(null);
    const r = await testConnection(url);
    setTesting(false);
    setResult(r.ok ? { ok: true, text: 'Connected. The server is reachable.' } : { ok: false, text: r.error || 'Could not connect.' });
  };

  const save = async () => {
    if (!url.trim()) { setResult({ ok: false, text: 'Enter the server address first.' }); return; }
    const saved = await setApiBaseUrl(url);
    toast.success('Server address saved');
    onSaved?.(saved);
    onClose();
  };

  const reset = async () => {
    const restored = await resetApiBaseUrl();
    setUrl(restored);
    setResult(null);
    toast.info('Server address reset');
    onSaved?.(restored);
  };

  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      title="Server connection"
      subtitle="Where the app finds your business data"
      footer={
        <View style={styles.actions}>
          <Button title="Test" variant="secondary" onPress={test} loading={testing} style={styles.flex} />
          <View style={{ width: spacing.md }} />
          <Button title="Save" onPress={save} style={styles.flex} />
        </View>
      }
    >
      <Text style={styles.help}>
        The address of the ChalaMob server. You normally never need to change this: the live server is already set.
      </Text>

      <FormInput
        label="Server address"
        value={url}
        onChangeText={(v) => { setUrl(v); setResult(null); }}
        placeholder="your-server.example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        helperText={`Will connect to ${url.trim() ? normalizeBaseUrl(url) : DEFAULT_BASE_URL}`}
      />

      <Text style={styles.presetLabel}>QUICK PRESETS</Text>
      <ChipRow
        variant="form"
        items={PRESETS}
        selected={PRESETS.some(p => p.key === normalizeBaseUrl(url || ' ')) ? normalizeBaseUrl(url) : ''}
        onSelect={(k) => { setUrl(k); setResult(null); }}
      />

      {result && (
        <View style={[styles.result, result.ok ? styles.resultOk : styles.resultBad]} accessibilityRole="alert">
          <Text style={[styles.resultText, { color: result.ok ? colors.greenDark : colors.redDark }]}>
            {result.ok ? '✓  ' : '✕  '}{result.text}
          </Text>
        </View>
      )}

      <Button title="Reset to default" variant="ghost" size="sm" onPress={reset} style={styles.reset} />
    </FormModal>
  );
};

const styles = StyleSheet.create({
  help: { fontSize: 14, color: colors.text2, lineHeight: 20, marginBottom: spacing.xl },
  presetLabel: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginBottom: 8 },
  result: { borderRadius: radius.sm, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg },
  resultOk: { backgroundColor: colors.greenSoft, borderColor: colors.greenBorder },
  resultBad: { backgroundColor: colors.redSoft, borderColor: colors.redBorder },
  resultText: { fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row' },
  flex: { flex: 1 },
  reset: { alignSelf: 'flex-start', marginTop: spacing.sm },
});

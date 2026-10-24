import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Keyboard, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { ServerSettingsSheet } from '../components/ServerSettingsSheet';
import { getApiBaseUrl, testConnection } from '../api/axios';
import { getErrorMessage } from '../api/errors';
import { useT } from '../i18n';
import { LanguagePicker } from '../components/LanguagePicker';
import { ForgotPasswordSheet } from '../components/ForgotPasswordSheet';
import { colors, radius, spacing, layout } from '../theme';

type ServerState = 'checking' | 'online' | 'offline';

// Developer-only conveniences. In a release build none of this exists: no quick-fill
// accounts, no prefilled credentials, and no server status bar.
const DEMO_ACCOUNTS = __DEV__ ? [
  { label: 'Owner', emoji: '👑', email: 'admin@chalamobile.com', password: 'admin123' },
  { label: 'Technician', emoji: '🔧', email: 'tech@chalamobile.com', password: 'tech123' },
  { label: 'Sales', emoji: '💼', email: 'sales@chalamobile.com', password: 'sales123' },
] : [];

export default function LoginScreen() {
  const t = useT();
  const [email, setEmail] = useState(__DEV__ ? DEMO_ACCOUNTS[0].email : '');
  const [password, setPassword] = useState(__DEV__ ? DEMO_ACCOUNTS[0].password : '');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const scrollRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const login = useAuthStore((s) => s.login);

  // Some first sign-ins take a while. After a few seconds, say so calmly, so it never looks frozen.
  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // With the keyboard open there is less room, so bring the form back into view.
  const revealForm = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t('Enter your email and password.'));
      return;
    }
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      if (err?.response?.status === 401) setError(t('Wrong email or password. Please try again.'));
      else setError(getErrorMessage(err, t('Could not sign in. Please try again.')));
    } finally {
      setLoading(false);
    }
  };

  // ---- developer tools (server status + address), compiled out of release builds
  const [server, setServer] = useState<ServerState>('checking');
  const [serverOpen, setServerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const checkServer = useCallback(async () => {
    setServer('checking');
    const res = await testConnection(undefined, 60000);
    setServer(res.ok ? 'online' : 'offline');
  }, []);
  useEffect(() => { if (__DEV__) checkServer(); }, [checkServer]);

  const dot = server === 'online' ? colors.green : server === 'offline' ? colors.red : colors.amber;
  const serverLabel = server === 'online' ? 'Server connected' : server === 'offline' ? "Can't reach server" : 'Connecting to server…';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.lang}><LanguagePicker variant="pill" /></View>

          <View style={styles.brand}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.phone}
              resizeMode="contain"
              accessibilityLabel="Chala Mobile"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.brandRow}>
              <Text style={styles.brandMain}>Chala </Text>
              <Text style={styles.brandAccent}>Mobile</Text>
            </View>
            <Text style={styles.brandSub}>{t('Business management')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('Sign in')}</Text>
            <Text style={styles.cardSub}>{t('Use the account your shop owner gave you.')}</Text>

            <FormInput
              label={t('Email')}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onFocus={revealForm}
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              leftIcon={<Icon name="mail" size={18} />}
            />
            <FormInput
              ref={passwordRef}
              label={t('Password')}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              placeholder={t('Your password')}
              isPassword
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onFocus={revealForm}
              onSubmitEditing={handleLogin}
              leftIcon={<Icon name="lock" size={18} />}
            />

            {error ? (
              <View style={styles.error} accessibilityRole="alert">
                <Icon name="alert-circle" size={16} color={colors.redDark} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button title={t('Sign in')} onPress={handleLogin} loading={loading} style={styles.signIn} />

            <TouchableOpacity onPress={() => setForgotOpen(true)} style={styles.forgot} accessibilityRole="button">
              <Text style={styles.forgotText}>{t('Forgot your password?')}</Text>
            </TouchableOpacity>

            {slow && (
              <View style={styles.wake} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.amberDark} />
                <Text style={styles.wakeText}>{t('This is taking a little longer than usual. Thanks for your patience.')}</Text>
              </View>
            )}

            {__DEV__ && (
              <View style={styles.demo}>
                <Text style={styles.demoTitle}>DEV QUICK FILL</Text>
                <View style={styles.demoRow}>
                  {DEMO_ACCOUNTS.map(a => (
                    <TouchableOpacity
                      key={a.label}
                      style={styles.demoPill}
                      onPress={() => { setEmail(a.email); setPassword(a.password); setError(null); }}
                    >
                      <Text style={styles.demoText}>{a.emoji} {a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {__DEV__ && (
            <TouchableOpacity
              style={styles.server}
              onPress={() => { setServerUrl(getApiBaseUrl()); setServerOpen(true); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${serverLabel}. Change server settings`}
            >
              {server === 'checking'
                ? <ActivityIndicator size="small" color={colors.amber} style={styles.serverSpinner} />
                : <View style={[styles.dot, { backgroundColor: dot }]} />}
              <View style={styles.flex}>
                <Text style={styles.serverTitle}>{serverLabel} (dev)</Text>
                <Text style={styles.serverUrl} numberOfLines={1}>{serverUrl}</Text>
              </View>
              <Text style={styles.serverAction}>Change</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.footer}>ChalaMob CRM</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordSheet
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
        onDone={(e) => { setEmail(e); setPassword(''); setError(null); }}
      />

      {__DEV__ && (
        <ServerSettingsSheet
          visible={serverOpen}
          onClose={() => setServerOpen(false)}
          onSaved={(url) => { setServerUrl(url); checkServer(); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: layout.screenX, paddingTop: spacing['3xl'], paddingBottom: spacing['3xl'] },

  lang: { marginBottom: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing['3xl'] },
  phone: { width: 76, height: 76, marginBottom: spacing.lg },
  brandRow: { flexDirection: 'row' },
  brandMain: { fontSize: 30, fontWeight: '900', color: colors.text1 },
  brandAccent: { fontSize: 30, fontWeight: '500', color: colors.amberDark },
  brandSub: { fontSize: 14, color: colors.text2, marginTop: 4 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: colors.navy },
  cardSub: { fontSize: 14, color: colors.text2, marginTop: 4, marginBottom: spacing.xl },

  error: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.redSoft, borderWidth: 1, borderColor: colors.redBorder,
    borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md,
  },
  errorIcon: { marginRight: spacing.sm },
  errorText: { flex: 1, color: colors.redDark, fontSize: 14, fontWeight: '600' },
  signIn: { marginTop: spacing.xs },
  forgot: { alignSelf: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  forgotText: { color: colors.red, fontSize: 14, fontWeight: '800' },
  wake: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amberBorder,
    borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md,
  },
  wakeText: { flex: 1, marginLeft: spacing.sm, color: colors.amberDark, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  footer: { textAlign: 'center', fontSize: 12, color: colors.text3, marginTop: spacing.xxl, fontWeight: '600' },

  demo: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderColor: colors.border },
  demoTitle: { fontSize: 11, fontWeight: '700', color: colors.text3, letterSpacing: 0.6, marginBottom: 8 },
  demoRow: { flexDirection: 'row', flexWrap: 'wrap' },
  demoPill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bgCard2,
    borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8,
  },
  demoText: { fontSize: 13, fontWeight: '700', color: colors.text2 },
  server: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, padding: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: 56,
  },
  serverSpinner: { marginRight: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  serverTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  serverUrl: { fontSize: 12, color: colors.text3, marginTop: 1 },
  serverAction: { fontSize: 13, fontWeight: '800', color: colors.red, paddingHorizontal: 8 },
});

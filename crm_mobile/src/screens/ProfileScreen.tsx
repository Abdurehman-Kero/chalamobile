import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, ScrollView, Switch, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useConnectivityStore } from '../store/connectivityStore';
import { useOutboxCounts } from '../offline/engine';
import { getErrorMessage } from '../api/errors';
import { toast } from '../store/toastStore';
import { useT, tx } from '../i18n';
import { OfflineBanner } from '../components/OfflineBanner';
import { SyncSheet } from '../components/SyncSheet';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { LanguagePicker } from '../components/LanguagePicker';
import { ServerSettingsSheet } from '../components/ServerSettingsSheet';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { getApiBaseUrl } from '../api/axios';
import * as repairsApi from '../api/repairs';
import {
  askPermission, openExactAlarmSettings, ReminderStatus, remindersEnabled, remindersSupported,
  reminderStatus, sendTestAlarm, setRemindersEnabled, syncReminders,
} from '../reminders/notifications';
import { colors, radius, shadow, spacing, layout } from '../theme';

const APP_VERSION: string = require('../../package.json').version;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_TONE = { owner: 'red', sales: 'blue', technician: 'amber' } as const;

type Sheet = 'details' | 'password' | 'sync' | 'server' | null;

export default function ProfileScreen() {
  const t = useT();
  const navigation: any = useNavigation();
  const user = useAuthStore(s => s.user);
  const saveProfile = useAuthStore(s => s.saveProfile);
  const logout = useAuthStore(s => s.logout);
  const online = useConnectivityStore(s => s.isOnline);
  const { pending, failed } = useOutboxCounts();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [saving, setSaving] = useState(false);

  // details form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  // password form
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  // Repair alarms (technician and owner)
  const showAlarms = remindersSupported && user?.role !== 'sales';
  const [alarmsOn, setAlarmsOn] = useState(true);
  const [alarmStatus, setAlarmStatus] = useState<ReminderStatus | null>(null);
  const refreshAlarms = useCallback(async () => {
    if (!showAlarms) return;
    setAlarmsOn(await remindersEnabled());
    setAlarmStatus(await reminderStatus());
  }, [showAlarms]);
  useEffect(() => {
    refreshAlarms();
    // Coming back from the system settings page, read the permissions again.
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refreshAlarms(); });
    return () => sub.remove();
  }, [refreshAlarms]);

  const toggleAlarms = async (on: boolean) => {
    setAlarmsOn(on);
    await setRemindersEnabled(on);
    if (on) {
      const status = await askPermission();
      setAlarmStatus(status);
      if (user) {
        try { await syncReminders(await repairsApi.getRepairs(), user.role, user.id); } catch { /* planned when the app next loads the jobs */ }
      }
    }
  };

  const testAlarm = async () => {
    const status = await askPermission();
    setAlarmStatus(status);
    if (!status.allowed) { toast.error(t('Allow notifications for this app in the phone settings first.')); return; }
    await sendTestAlarm();
    toast.info(t('An alarm will ring in a few seconds.'));
  };

  const roleLabel = { owner: t('Admin'), sales: t('Sales'), technician: t('Technician') }[user?.role ?? 'sales'];
  const waiting = pending + failed;
  const emailChanged = !!user && email.trim().toLowerCase() !== user.email.toLowerCase();

  const openDetails = () => {
    setName(user?.name ?? ''); setEmail(user?.email ?? ''); setConfirmPw(''); setErrors({});
    setSheet('details');
  };
  const openPassword = () => {
    setCurrent(''); setNext(''); setAgain(''); setErrors({});
    setSheet('password');
  };

  const fail = (err: any) => {
    const code = err?.response?.data?.code;
    if (code === 'DUPLICATE_EMAIL') setErrors({ email: t('Someone already uses this email') });
    else if (code === 'WRONG_PASSWORD') setErrors({ current: t('That is not your current password'), confirm: t('That is not your current password') });
    else if (err?.response?.status === 404) toast.error(t('The server needs to be updated before this works. Please tell the shop owner.'));
    else toast.error(getErrorMessage(err, t('Could not save. Please try again.')));
  };

  const saveDetails = async () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = t('Enter your name');
    if (!EMAIL_RE.test(email.trim())) e.email = t('Enter a valid email address');
    if (emailChanged && !confirmPw) e.confirm = t('Enter your password to confirm');
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await saveProfile({
        name: name.trim(),
        ...(emailChanged ? { email: email.trim(), current_password: confirmPw } : {}),
      });
      setSheet(null);
      toast.success(t('Your details were saved'));
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    const e: typeof errors = {};
    if (!current) e.current = t('Enter your current password');
    if (next.length < 6) e.next = t('Use at least 6 characters');
    else if (next === current) e.next = t('Choose a different password');
    if (again !== next) e.again = t('The two passwords do not match');
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await saveProfile({ password: next, current_password: current });
      setSheet(null);
      toast.success(t('Your password was changed'));
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    const note = waiting > 0
      ? `\n\n${t(waiting === 1 ? tx('{n} change has not reached the server yet. It stays on this phone and is sent the next time you sign in.') : tx('{n} changes have not reached the server yet. They stay on this phone and are sent the next time you sign in.'), { n: waiting })}`
      : '';
    Alert.alert(t('Sign out?'), `${t('You will need to sign in again to use the app.')}${note}`, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Sign out'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const clear = (key: string) => setErrors(x => ({ ...x, [key]: undefined }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <OfflineBanner />
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('Back')}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">{t('Profile')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.sm, styles.identity]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text></View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <Badge label={roleLabel} variant={ROLE_TONE[user?.role ?? 'sales']} style={styles.role} />
          </View>
        </View>

        <Text style={styles.section}>{t('ACCOUNT')}</Text>
        <View style={[styles.card, shadow.sm]}>
          <Row title={t('Name and email')} sub={t('Change how you sign in')} onPress={openDetails} />
          <Row title={t('Password')} sub={t('Choose a new password')} onPress={openPassword} last={user?.role !== 'owner'} />
          {user?.role === 'owner' && (
            <Row title={t('Team')} sub={t('Add people and change their email or password')} onPress={() => navigation.navigate('Team')} last />
          )}
        </View>

        <Text style={styles.section}>{t('LANGUAGE')}</Text>
        <View style={[styles.card, shadow.sm]}>
          <LanguagePicker />
        </View>

        <Text style={styles.section}>{t('SYNC')}</Text>
        <View style={[styles.card, shadow.sm]}>
          <Row
            title={online ? t('Connected') : t('Offline')}
            sub={waiting > 0 ? t(waiting === 1 ? tx('{n} change waiting to sync') : tx('{n} changes waiting to sync'), { n: waiting }) : t('Everything is saved on the server')}
            onPress={() => setSheet('sync')}
            last
            dot={online ? colors.green : colors.amber}
          />
        </View>

        {showAlarms && (
          <>
            <Text style={styles.section}>{t('REPAIR ALARMS')}</Text>
            <View style={[styles.card, shadow.sm]}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{t('Ring the day before')}</Text>
                  <Text style={styles.rowSub}>{t('An alarm with sound and a message at 9:00 the day before each customer comes, and again that morning.')}</Text>
                </View>
                <Switch value={alarmsOn} onValueChange={toggleAlarms} trackColor={{ false: colors.border2, true: colors.green }} thumbColor={colors.white} />
              </View>
              {alarmsOn && alarmStatus && !alarmStatus.allowed && (
                <Row title={t('Notifications are off')} sub={t('Tap to allow them, or the alarms cannot show.')} onPress={async () => setAlarmStatus(await askPermission())} />
              )}
              {alarmsOn && alarmStatus?.allowed && !alarmStatus.exactAlarms && (
                <Row title={t('Allow exact alarms')} sub={t('So the alarm rings at the exact minute, even when the phone is resting.')} onPress={() => openExactAlarmSettings()} />
              )}
              <Row title={t('Try an alarm')} sub={t('Rings in 5 seconds so you can hear it.')} onPress={testAlarm} last />
            </View>
          </>
        )}

        {__DEV__ && (
          <>
            <Text style={styles.section}>DEVELOPER</Text>
            <View style={[styles.card, shadow.sm]}>
              <Row title="Server connection" sub={serverUrl} onPress={() => { setServerUrl(getApiBaseUrl()); setSheet('server'); }} last />
            </View>
          </>
        )}

        <Button title={t('Sign out')} variant="danger" onPress={confirmLogout} style={styles.signOut} />
        <Text style={styles.version}>Chala Mobile · v{APP_VERSION}</Text>
      </ScrollView>

      <FormModal
        visible={sheet === 'details'}
        onClose={() => setSheet(null)}
        title={t('Name and email')}
        subtitle={t('You sign in with this email')}
        footer={<Button title={t('Save changes')} onPress={saveDetails} loading={saving} />}
      >
        <FormInput label={t('Full name')} value={name} onChangeText={v => { setName(v); clear('name'); }} autoCapitalize="words" error={errors.name} />
        <FormInput
          label={t('Email')} value={email} onChangeText={v => { setEmail(v); clear('email'); }}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email}
        />
        {emailChanged && (
          <FormInput
            label={t('Current password')} value={confirmPw} onChangeText={v => { setConfirmPw(v); clear('confirm'); }}
            isPassword autoCapitalize="none" error={errors.confirm} helperText={t('Needed to change your email.')}
          />
        )}
      </FormModal>

      <FormModal
        visible={sheet === 'password'}
        onClose={() => setSheet(null)}
        title={t('Change password')}
        subtitle={t('At least 6 characters')}
        footer={<Button title={t('Change password')} onPress={savePassword} loading={saving} />}
      >
        <FormInput label={t('Current password')} value={current} onChangeText={v => { setCurrent(v); clear('current'); }} isPassword autoCapitalize="none" error={errors.current} />
        <FormInput label={t('New password')} value={next} onChangeText={v => { setNext(v); clear('next'); }} isPassword autoCapitalize="none" error={errors.next} />
        <FormInput label={t('Repeat new password')} value={again} onChangeText={v => { setAgain(v); clear('again'); }} isPassword autoCapitalize="none" error={errors.again} />
      </FormModal>

      <SyncSheet visible={sheet === 'sync'} onClose={() => setSheet(null)} />
      {__DEV__ && <ServerSettingsSheet visible={sheet === 'server'} onClose={() => setSheet(null)} onSaved={setServerUrl} />}
    </SafeAreaView>
  );
}

const Row: React.FC<{ title: string; sub?: string; onPress: () => void; last?: boolean; dot?: string }> = ({ title, sub, onPress, last, dot }) => (
  <TouchableOpacity style={[styles.row, last && styles.rowLast]} activeOpacity={0.7} onPress={onPress} accessibilityRole="button">
    {dot ? <View style={[styles.statusDot, { backgroundColor: dot }]} /> : null}
    <View style={styles.flex}>
      <Text style={styles.rowTitle}>{title}</Text>
      {sub ? <Text style={styles.rowSub} numberOfLines={2}>{sub}</Text> : null}
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border,
    paddingHorizontal: layout.screenX, paddingTop: layout.topGap + spacing.sm, paddingBottom: spacing.md,
  },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  backIcon: { fontSize: 28, color: colors.navy, marginTop: -3 },
  title: { fontSize: 20, fontWeight: '900', color: colors.navy },
  scroll: { paddingHorizontal: layout.screenX, paddingTop: spacing.lg, paddingBottom: layout.bottomGap },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '900' },
  name: { fontSize: 18, fontWeight: '900', color: colors.navy },
  email: { fontSize: 13, color: colors.text2, marginTop: 2 },
  role: { marginTop: 8 },
  section: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  rowSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.text3, marginLeft: 8 },
  signOut: { marginTop: spacing.xxl },
  version: { textAlign: 'center', fontSize: 12, color: colors.text3, marginTop: spacing.lg },
});

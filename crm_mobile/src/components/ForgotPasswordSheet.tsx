import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FormModal } from './FormModal';
import { FormInput } from './FormInput';
import { Button } from './Button';
import * as authApi from '../api/auth';
import { getErrorMessage } from '../api/errors';
import { useT } from '../i18n';
import { toast } from '../store/toastStore';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialEmail?: string;
  // Called after the password was changed, so the sign-in screen can fill in the email.
  onDone: (email: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'code';

// "I forgot my password": ask for a code by email, then choose a new password with it.
// The owner can use the recovery key kept on the server in place of the emailed code.
export const ForgotPasswordSheet: React.FC<Props> = ({ visible, onClose, initialEmail, onDone }) => {
  const t = useT();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!visible) return;
    setStep('email'); setEmail(initialEmail ?? ''); setCode(''); setPassword(''); setAgain('');
    setNotice(null); setErrors({}); setBusy(false);
  }, [visible, initialEmail]);

  const clear = (k: string) => setErrors(e => ({ ...e, [k]: undefined }));

  const sendCode = async () => {
    if (!EMAIL_RE.test(email.trim())) { setErrors({ email: t('Enter a valid email address') }); return; }
    setBusy(true);
    setNotice(null);
    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res.method === 'email') {
        setStep('code');
        setNotice(t('If this email belongs to an account, a 6-digit code was sent to it. It works for 15 minutes. Look in the spam folder too.'));
      } else {
        setNotice(res.recovery_key
          ? t('Codes by email are not set up. The shop owner can continue with the recovery key. Everyone else: ask the owner to reset your password in Team.')
          : t('Codes by email are not set up yet. Ask the shop owner to reset your password in Team.'));
      }
    } catch (err: any) {
      setNotice(err?.response?.status === 404
        ? t('The server needs to be updated before this works. Please tell the shop owner.')
        : getErrorMessage(err, t('Could not send the code. Please try again.')));
    } finally {
      setBusy(false);
    }
  };

  const change = async () => {
    const e: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) e.email = t('Enter a valid email address');
    if (!code.trim()) e.code = t('Enter the code');
    if (password.length < 6) e.password = t('Use at least 6 characters');
    if (again !== password) e.again = t('The two passwords do not match');
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await authApi.resetPassword(email.trim(), code.trim(), password);
      toast.success(t('Your password was changed. Sign in with it.'));
      onDone(email.trim());
      onClose();
    } catch (err: any) {
      if (err?.response?.data?.code === 'INVALID_CODE') setErrors({ code: err.response.data.error });
      else if (err?.response?.status === 404) setNotice(t('The server needs to be updated before this works. Please tell the shop owner.'));
      else setNotice(getErrorMessage(err, t('Could not change the password. Please try again.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      visible={visible}
      onClose={onClose}
      title={t('Forgot your password?')}
      subtitle={step === 'email' ? t('We will email you a code') : t('Choose a new password')}
      footer={step === 'email'
        ? <Button title={t('Send the code')} onPress={sendCode} loading={busy} />
        : <Button title={t('Change password')} onPress={change} loading={busy} />}
    >
      <FormInput
        label={t('Email')} value={email} onChangeText={v => { setEmail(v); clear('email'); }}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email}
        editable={step === 'email'}
      />

      {notice ? (
        <View style={styles.notice} accessibilityRole="alert"><Text style={styles.noticeText}>{notice}</Text></View>
      ) : null}

      {step === 'code' ? (
        <>
          <FormInput
            label={t('Code or recovery key')} value={code} onChangeText={v => { setCode(v); clear('code'); }}
            autoCapitalize="none" autoCorrect={false} error={errors.code}
          />
          <FormInput label={t('New password')} value={password} onChangeText={v => { setPassword(v); clear('password'); }} isPassword autoCapitalize="none" error={errors.password} />
          <FormInput label={t('Repeat new password')} value={again} onChangeText={v => { setAgain(v); clear('again'); }} isPassword autoCapitalize="none" error={errors.again} />
          <TouchableOpacity onPress={() => { setStep('email'); setNotice(null); }} style={styles.link} accessibilityRole="button">
            <Text style={styles.linkText}>{t('Send a new code')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          onPress={() => {
            if (!EMAIL_RE.test(email.trim())) { setErrors({ email: t('Enter a valid email address') }); return; }
            setStep('code'); setNotice(null);
          }}
          style={styles.link} accessibilityRole="button"
        >
          <Text style={styles.linkText}>{t('I already have a code or recovery key')}</Text>
        </TouchableOpacity>
      )}
    </FormModal>
  );
};

const styles = StyleSheet.create({
  notice: { backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amberBorder, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.lg },
  noticeText: { color: colors.amberDark, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  link: { alignSelf: 'flex-start', paddingVertical: spacing.md },
  linkText: { color: colors.red, fontSize: 14, fontWeight: '800' },
});

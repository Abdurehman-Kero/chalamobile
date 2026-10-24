import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { login, register as registerAccount } from '../api/shop';
import { errorMessage } from '../api/client';
import { useT } from '../i18n';
import { emailRule, nameRule, passwordRule, phoneRule } from '../lib/validation';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import { Button } from '../components/ui/Button';
import { FormAlert, TextField } from '../components/ui/Field';
import { Seo } from '../components/ui/Seo';

interface FormValues { name: string; phone: string; email: string; password: string }

// Only paths inside this site are allowed as a "go back to" target.
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const t = useT();
  const isRegister = mode === 'register';
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signedIn = useAuth(s => !!s.token);
  const signIn = useAuth(s => s.signIn);
  const show = useToast(s => s.show);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>();

  if (signedIn) return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = isRegister
        ? await registerAccount({ name: values.name.trim(), phone: values.phone, password: values.password, email: values.email.trim() || undefined })
        : await login({ phone: values.phone, password: values.password });
      signIn(result.token, result.account);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      show(isRegister ? t('auth.welcome', { name: result.account.name.split(' ')[0] ?? '' }) : t('auth.signedIn'));
      navigate(next, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  const other = `${isRegister ? '/login' : '/register'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 sm:py-14">
      <Seo title={isRegister ? t('auth.create') : t('auth.signIn')} />
      <div className="rounded-2xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{isRegister ? t('auth.createTitle') : t('auth.welcomeBack')}</h1>
        <p className="mt-1 text-sm text-muted">{isRegister ? t('auth.createSub') : t('auth.loginSub')}</p>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4 sm:mt-6">
          {isRegister && (
            <TextField label={t('auth.name')} autoComplete="name" {...register('name', nameRule(t))} error={errors.name?.message} />
          )}
          <TextField
            label={t('auth.phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="0911 234 567"
            {...register('phone', phoneRule(t))} error={errors.phone?.message}
          />
          {isRegister && (
            <TextField label={t('auth.email')} optional type="email" autoComplete="email" {...register('email', emailRule(t))} error={errors.email?.message} />
          )}
          <TextField
            label={t('auth.password')} type="password" autoComplete={isRegister ? 'new-password' : 'current-password'}
            hint={isRegister ? t('auth.passwordHint') : undefined}
            {...register('password', isRegister ? passwordRule(t) : { required: t('auth.enterPassword') })} error={errors.password?.message}
          />
          <FormAlert message={formError} />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('auth.wait') : isRegister ? t('auth.create') : t('auth.signIn')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? t('auth.haveAcc') : t('auth.newTo')}{' '}
          <Link to={other} className="font-semibold text-link underline underline-offset-2">{isRegister ? t('auth.signIn') : t('auth.createAcc')}</Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { login, register as registerAccount } from '../api/shop';
import { errorMessage } from '../api/client';
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
      show(isRegister ? `Welcome, ${result.account.name.split(' ')[0]}!` : 'Signed in');
      navigate(next, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  const other = `${isRegister ? '/login' : '/register'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-14">
      <Seo title={isRegister ? 'Create account' : 'Sign in'} />
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-muted">
          {isRegister ? 'An account lets you place orders and follow them. It takes a minute.' : 'Sign in with your phone number.'}
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {isRegister && (
            <TextField label="Full name" autoComplete="name" {...register('name', nameRule)} error={errors.name?.message} />
          )}
          <TextField
            label="Phone number" type="tel" inputMode="tel" autoComplete="tel" placeholder="0911 234 567"
            {...register('phone', phoneRule)} error={errors.phone?.message}
          />
          {isRegister && (
            <TextField label="Email" optional type="email" autoComplete="email" {...register('email', emailRule)} error={errors.email?.message} />
          )}
          <TextField
            label="Password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'}
            hint={isRegister ? 'At least 6 characters' : undefined}
            {...register('password', isRegister ? passwordRule : { required: 'Enter your password' })} error={errors.password?.message}
          />
          <FormAlert message={formError} />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? 'Already have an account?' : 'New to Chala Mobile?'}{' '}
          <Link to={other} className="font-semibold text-brand underline underline-offset-2">{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </div>
    </div>
  );
}

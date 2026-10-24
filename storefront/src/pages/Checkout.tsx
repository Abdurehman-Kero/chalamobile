import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { placeOrder } from '../api/shop';
import { errorMessage } from '../api/client';
import { useT, type Key } from '../i18n';
import { formatBr } from '../lib/format';
import { nameRule, newKey, phoneRule } from '../lib/validation';
import { useAuth } from '../store/auth';
import { cartTotal, useCart } from '../store/cart';
import type { DeliveryMethod, PaymentMethod } from '../types';
import { Button, LinkButton, buttonClass } from '../components/ui/Button';
import { FormAlert, TextArea, TextField } from '../components/ui/Field';
import { EmptyState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';

interface FormValues {
  name: string; phone: string; delivery_method: DeliveryMethod; address: string; payment_method: PaymentMethod; note: string;
}

interface Option<T> { value: T; title: Key; text: Key }

const DELIVERY: Option<DeliveryMethod>[] = [
  { value: 'delivery', title: 'co.delivery', text: 'co.deliveryText' },
  { value: 'pickup', title: 'co.pickup', text: 'co.pickupText' },
];
const PAYMENT: Option<PaymentMethod>[] = [
  { value: 'telebirr', title: 'pay.telebirr', text: 'co.telebirrText' },
  { value: 'cbe', title: 'pay.cbe', text: 'co.cbeText' },
  { value: 'cash', title: 'pay.cash', text: 'co.cashText' },
];

function OptionCards<T extends string>({ name, legend, options, value, onChange }: {
  name: string; legend: string; options: Option<T>[]; value: T; onChange: (v: T) => void;
}) {
  const t = useT();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map(o => (
          <label
            key={o.value}
            className={`flex min-h-[60px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors sm:min-h-[64px] sm:p-3.5 ${value === o.value ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface hover:bg-sunken'}`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
            <span className="min-w-0"><span className="block text-sm font-semibold">{t(o.title)}</span><span className="block text-xs text-muted">{t(o.text)}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Checkout() {
  const t = useT();
  const account = useAuth(s => s.account);
  const lines = useCart(s => s.lines);
  const clear = useCart(s => s.clear);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const total = cartTotal(lines);
  const [formError, setFormError] = useState<string | null>(null);
  const [attemptKey, setAttemptKey] = useState(newKey);

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: account?.name ?? '', phone: account?.phone ?? '', delivery_method: 'delivery', address: '', payment_method: 'telebirr', note: '',
    },
  });
  const delivery = useWatch({ control, name: 'delivery_method' });
  const payment = useWatch({ control, name: 'payment_method' });

  if (lines.length === 0) {
    return (
      <EmptyState icon="cart" title={t('cart.empty')} message={t('cart.emptyText')}
        action={<Link to="/shop" className={buttonClass()}>{t('p.browse')}</Link>} />
    );
  }

  const summary = (
    <aside className="rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-[calc(var(--header-h,64px)+16px)]" aria-label={t('co.summaryAria')}>
      <h2 className="text-lg font-bold">{t('co.yourOrder')}</h2>
      <ul className="mt-3 divide-y divide-line">
        {lines.map(l => (
          <li key={l.id} className="flex items-center gap-3 py-3">
            <ProductImage src={l.image} alt="" width={160} className="h-12 w-12 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{l.name}</span>
              <span className="block text-xs text-muted">{t('co.qty', { n: l.qty })}</span>
            </span>
            <span className="text-sm font-semibold">{formatBr(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-semibold">{t('cart.total')}</span>
        <span className="text-2xl font-bold">{formatBr(total)}</span>
      </div>
      <p className="mt-2 text-xs text-muted">{t('co.deliveryNote')}</p>
    </aside>
  );

  // Browsing is open to everyone; placing an order needs an account.
  if (!account) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Seo title={t('co.title')} />
        <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6">
          <div className="rounded-2xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-8">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('co.createTitle')}</h1>
            <p className="mt-2 text-muted">{t('co.createText')}</p>
            <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row">
              <LinkButton to="/register?next=/checkout" size="lg">{t('co.create')}</LinkButton>
              <LinkButton to="/login?next=/checkout" variant="secondary" size="lg">{t('co.haveAccount')}</LinkButton>
            </div>
          </div>
          {summary}
        </div>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const order = await placeOrder({
        items: lines.map(l => ({ product_id: l.id, qty: l.qty })),
        name: v.name.trim(),
        phone: v.phone,
        delivery_method: v.delivery_method,
        address: v.delivery_method === 'delivery' ? v.address.trim() : undefined,
        payment_method: v.payment_method,
        note: v.note.trim() || undefined,
      }, attemptKey);
      clear();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      navigate(`/orders/${order.id}`, { replace: true, state: { placed: true } });
    } catch (err) {
      setFormError(errorMessage(err));
      // A rejected order (for example, an item sold out) is a new attempt once the cart changes.
      setAttemptKey(newKey());
    }
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <Seo title={t('co.title')} />
      <PageHeader title={t('co.title')} fallback="/cart" />
      <div className="mt-4 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl border border-line bg-surface p-4 sm:space-y-6 sm:rounded-3xl sm:p-8">
          <section className="space-y-4" aria-label={t('co.details')}>
            <h2 className="text-lg font-bold">{t('co.details')}</h2>
            <TextField label={t('co.fullName')} autoComplete="name" {...register('name', nameRule(t))} error={errors.name?.message} />
            <TextField
              label={t('co.phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="0911 234 567"
              hint={t('co.phoneHint')} {...register('phone', phoneRule(t))} error={errors.phone?.message}
            />
          </section>

          <OptionCards name="delivery" legend={t('co.how')} options={DELIVERY} value={delivery}
            onChange={v => setValue('delivery_method', v)} />
          {delivery === 'delivery' && (
            <TextArea
              label={t('co.address')} autoComplete="street-address" placeholder={t('co.addressPh')}
              {...register('address', { validate: v => v.trim().length >= 5 || t('co.addressReq') })} error={errors.address?.message}
            />
          )}

          <OptionCards name="payment" legend={t('co.howPay')} options={PAYMENT} value={payment}
            onChange={v => setValue('payment_method', v)} />

          <TextArea label={t('co.note')} optional placeholder={t('co.notePh')}
            {...register('note', { maxLength: { value: 500, message: t('co.noteMax') } })} error={errors.note?.message} />

          <FormAlert message={formError} />
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? t('co.placing') : t('co.place', { total: formatBr(total) })}
          </Button>
          <p className="text-center text-xs text-muted">{t('co.noPayment')}</p>
        </form>
        {summary}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { placeOrder } from '../api/shop';
import { errorMessage } from '../api/client';
import { formatBr } from '../lib/format';
import { nameRule, newKey, phoneRule } from '../lib/validation';
import { useAuth } from '../store/auth';
import { cartTotal, useCart } from '../store/cart';
import type { DeliveryMethod, PaymentMethod } from '../types';
import { Button, LinkButton, buttonClass } from '../components/ui/Button';
import { FormAlert, TextArea, TextField } from '../components/ui/Field';
import { EmptyState } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';

interface FormValues {
  name: string; phone: string; delivery_method: DeliveryMethod; address: string; payment_method: PaymentMethod; note: string;
}

const DELIVERY: { value: DeliveryMethod; title: string; text: string }[] = [
  { value: 'delivery', title: 'Delivery', text: 'We bring it to your address' },
  { value: 'pickup', title: 'Pick up in shop', text: 'Collect it from Chala Mobile' },
];
const PAYMENT: { value: PaymentMethod; title: string; text: string }[] = [
  { value: 'telebirr', title: 'Telebirr', text: 'We share our Telebirr details when we call' },
  { value: 'cbe', title: 'CBE', text: 'We share our bank details when we call' },
  { value: 'cash', title: 'Cash', text: 'Pay on delivery or at the shop' },
];

function OptionCards<T extends string>({ name, legend, options, value, onChange }: {
  name: string; legend: string; options: { value: T; title: string; text: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map(o => (
          <label
            key={o.value}
            className={`flex min-h-[64px] cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${value === o.value ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface hover:bg-sunken'}`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-1 h-4 w-4 accent-[var(--color-brand)]" />
            <span><span className="block text-sm font-semibold">{o.title}</span><span className="block text-xs text-muted">{o.text}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Checkout() {
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
      <EmptyState icon="cart" title="Your cart is empty" message="Add something to your cart before checking out."
        action={<Link to="/shop" className={buttonClass()}>Browse the shop</Link>} />
    );
  }

  const summary = (
    <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-[calc(var(--header-h,64px)+16px)]" aria-label="Order summary">
      <h2 className="text-lg font-bold">Your order</h2>
      <ul className="mt-3 divide-y divide-line">
        {lines.map(l => (
          <li key={l.id} className="flex items-center gap-3 py-3">
            <ProductImage src={l.image} alt="" width={160} className="h-12 w-12 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{l.name}</span>
              <span className="block text-xs text-muted">Qty {l.qty}</span>
            </span>
            <span className="text-sm font-semibold">{formatBr(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-semibold">Total</span>
        <span className="text-2xl font-bold">{formatBr(total)}</span>
      </div>
      <p className="mt-2 text-xs text-muted">Delivery cost, if any, is agreed with you by phone.</p>
    </aside>
  );

  // Browsing is open to everyone; placing an order needs an account.
  if (!account) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Seo title="Checkout" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight">Create an account to order</h1>
            <p className="mt-2 text-muted">
              So we can reach you about your order and you can follow it from your phone. Your cart is saved, nothing is lost.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/register?next=/checkout" size="lg">Create account</LinkButton>
              <LinkButton to="/login?next=/checkout" variant="secondary" size="lg">I already have an account</LinkButton>
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
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <Seo title="Checkout" />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-3xl border border-line bg-surface p-5 sm:p-8">
          <section className="space-y-4" aria-label="Contact">
            <h2 className="text-lg font-bold">Your details</h2>
            <TextField label="Full name" autoComplete="name" {...register('name', nameRule)} error={errors.name?.message} />
            <TextField
              label="Phone number" type="tel" inputMode="tel" autoComplete="tel" placeholder="0911 234 567"
              hint="We will call this number to confirm your order." {...register('phone', phoneRule)} error={errors.phone?.message}
            />
          </section>

          <OptionCards name="delivery" legend="How do you want to get it?" options={DELIVERY} value={delivery}
            onChange={v => setValue('delivery_method', v)} />
          {delivery === 'delivery' && (
            <TextArea
              label="Delivery address" autoComplete="street-address" placeholder="Area, street, nearby landmark"
              {...register('address', { validate: v => v.trim().length >= 5 || 'Enter your delivery address' })} error={errors.address?.message}
            />
          )}

          <OptionCards name="payment" legend="How would you like to pay?" options={PAYMENT} value={payment}
            onChange={v => setValue('payment_method', v)} />

          <TextArea label="Note for the shop" optional placeholder="Colour, a time to call, anything we should know"
            {...register('note', { maxLength: { value: 500, message: 'Keep it under 500 characters' } })} error={errors.note?.message} />

          <FormAlert message={formError} />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Placing your order…' : `Place order · ${formatBr(total)}`}
          </Button>
          <p className="text-center text-xs text-muted">No payment is taken now. We call you to confirm first.</p>
        </form>
        {summary}
      </div>
    </div>
  );
}

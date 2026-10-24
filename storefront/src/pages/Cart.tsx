import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { formatBr, productPath } from '../lib/format';
import { cartCount, cartTotal, useCart } from '../store/cart';
import { LinkButton, buttonClass } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { QtyStepper } from '../components/ui/QtyStepper';
import { EmptyState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';

export default function Cart() {
  const t = useT();
  const lines = useCart(s => s.lines);
  const setQty = useCart(s => s.setQty);
  const remove = useCart(s => s.remove);
  const total = cartTotal(lines);
  const count = cartCount(lines);

  if (lines.length === 0) {
    return (
      <>
        <Seo title={t('cart.title')} />
        <EmptyState
          icon="cart" title={t('cart.empty')} message={t('cart.emptyText')}
          action={<Link to="/shop" className={buttonClass()}>{t('cart.start')}</Link>}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
      <Seo title={t('cart.title')} />
      <PageHeader title={t('cart.title')} note={`(${count})`} fallback="/shop" />

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* One card per item: photo, name, price, then the quantity and what that line costs. */}
        <ul className="space-y-3">
          {lines.map(l => (
            <li key={l.id} className="relative flex gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card sm:gap-4 sm:p-4">
              <Link to={productPath(l.id)} className="shrink-0" aria-label={t('cart.view', { name: l.name })}>
                <ProductImage src={l.image} alt="" width={240} className="h-[84px] w-[84px] rounded-xl sm:h-24 sm:w-24" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={productPath(l.id)} className="line-clamp-2 pr-9 text-sm font-semibold leading-5 hover:underline sm:text-base">{l.name}</Link>
                <p className="mt-0.5 truncate text-xs text-muted sm:text-[13px]">
                  {[l.specs, formatBr(l.price)].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2.5">
                  <QtyStepper qty={l.qty} setQty={n => setQty(l.id, n)} compact small />
                  <p className="text-base font-bold tracking-tight sm:text-lg">{formatBr(l.price * l.qty)}</p>
                </div>
              </div>
              <button
                type="button" onClick={() => remove(l.id)} aria-label={t('cart.remove', { name: l.name })}
                className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-danger"
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>

        {/* Phones: two short reassurances. The total and the Checkout button are in the bar at the bottom. */}
        <ul className="space-y-2.5 rounded-2xl bg-sunken p-4 text-[13px] leading-snug text-muted lg:hidden">
          <li className="flex gap-3"><Icon name="truck" size={18} className="mt-0.5 shrink-0 text-brand-ink" /><span>{t('co.deliveryNote')}</span></li>
          <li className="flex gap-3"><Icon name="wallet" size={18} className="mt-0.5 shrink-0 text-brand-ink" /><span>{t('co.noPayment')}</span></li>
        </ul>

        {/* Larger screens: the summary beside the items, with the one Checkout button. */}
        <aside className="hidden rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-[calc(var(--header-h,64px)+16px)] lg:block" aria-label={t('co.summaryAria')}>
          <h2 className="text-lg font-bold">{t('cart.summary')}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t('cart.items', { n: count })}</dt><dd className="font-semibold">{formatBr(total)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t('cart.delivery')}</dt><dd className="text-right text-muted">{t('cart.byPhone')}</dd></div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">{t('cart.total')}</span>
            <span className="text-2xl font-bold">{formatBr(total)}</span>
          </div>
          <LinkButton to="/checkout" size="lg" className="mt-5 w-full">{t('cart.checkout')}</LinkButton>
          <Link to="/shop" className="mt-3 flex min-h-11 items-center justify-center text-sm font-semibold text-link">{t('cart.continue')}</Link>
          <p className="mt-3 text-center text-xs text-muted">{t('co.noPayment')}</p>
        </aside>
      </div>

      {/* Phones: the total and Checkout stay at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgb(20_20_19/0.06)] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="shrink-0">
            <p className="text-xs text-muted">{t('cart.total')} · {count}</p>
            <p className="text-lg font-bold leading-tight">{formatBr(total)}</p>
          </div>
          <LinkButton to="/checkout" size="lg" className="min-w-0 flex-1 whitespace-nowrap">{t('cart.checkout')}</LinkButton>
        </div>
      </div>
    </div>
  );
}

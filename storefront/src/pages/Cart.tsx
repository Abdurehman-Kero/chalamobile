import { Link } from 'react-router-dom';
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
  const lines = useCart(s => s.lines);
  const setQty = useCart(s => s.setQty);
  const remove = useCart(s => s.remove);
  const total = cartTotal(lines);
  const count = cartCount(lines);

  if (lines.length === 0) {
    return (
      <>
        <Seo title="Your cart" />
        <EmptyState
          icon="cart" title="Your cart is empty" message="Find something you like and add it here."
          action={<Link to="/shop" className={buttonClass()}>Start shopping</Link>}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <Seo title="Your cart" />
      <PageHeader title="Your cart" note={`(${count})`} fallback="/shop" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {lines.map(l => (
            <li key={l.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
              <Link to={productPath(l.id)} className="shrink-0" aria-label={`View ${l.name}`}>
                <ProductImage src={l.image} alt="" width={240} className="h-20 w-20 rounded-xl sm:h-24 sm:w-24" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={productPath(l.id)} className="line-clamp-2 text-sm font-semibold leading-5 hover:underline sm:text-base">{l.name}</Link>
                {l.specs && <p className="truncate text-xs text-muted">{l.specs}</p>}
                <p className="mt-1 text-sm font-bold sm:text-base">{formatBr(l.price)}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <QtyStepper qty={l.qty} setQty={n => setQty(l.id, n)} compact />
                  <button
                    type="button" onClick={() => remove(l.id)} aria-label={`Remove ${l.name}`}
                    className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-danger"
                  >
                    <Icon name="trash" size={19} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-[calc(var(--header-h,64px)+16px)]" aria-label="Order summary">
          <h2 className="text-lg font-bold">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Items ({count})</dt><dd className="font-semibold">{formatBr(total)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="text-muted">Confirmed by phone</dd></div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-bold">{formatBr(total)}</span>
          </div>
          <LinkButton to="/checkout" size="lg" className="mt-5 hidden w-full lg:inline-flex">Checkout</LinkButton>
          <Link to="/shop" className="mt-3 hidden min-h-11 items-center justify-center text-sm font-semibold text-brand-ink lg:flex">Continue shopping</Link>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div>
            <p className="text-xs text-muted">Total</p>
            <p className="text-lg font-bold leading-tight">{formatBr(total)}</p>
          </div>
          <LinkButton to="/checkout" size="lg" className="flex-1">Checkout</LinkButton>
        </div>
      </div>
    </div>
  );
}

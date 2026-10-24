import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrder } from '../api/shop';
import { errorMessage } from '../api/client';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';
import { formatBr, formatDate } from '../lib/format';
import type { Order } from '../types';
import { buttonClass } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { StatusBadge } from '../components/ui/StatusBadge';

const PAYMENT_LABEL = { telebirr: 'Telebirr', cbe: 'CBE', cash: 'Cash' } as const;

function Timeline({ order }: { order: Order }) {
  const steps = [
    { key: 'pending', label: 'Order received' },
    { key: 'confirmed', label: 'Confirmed by the shop' },
    { key: 'ready', label: order.delivery_method === 'pickup' ? 'Ready for pickup' : 'On its way' },
    { key: 'delivered', label: 'Completed' },
  ];
  const reached = steps.findIndex(s => s.key === order.status);

  if (order.status === 'cancelled') {
    return <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">This order was cancelled. Call the shop if you have any questions.</p>;
  }
  return (
    <ol className="space-y-0" aria-label="Order progress">
      {steps.map((s, i) => {
        const done = i <= reached;
        return (
          <li key={s.key} className="flex gap-3" aria-current={i === reached ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${done ? 'bg-brand text-on-brand' : 'border-2 border-line-strong bg-surface'}`}>
                {done && <Icon name="check" size={15} />}
              </span>
              {i < steps.length - 1 && <span className={`my-1 w-0.5 flex-1 ${i < reached ? 'bg-brand' : 'bg-line-strong'}`} style={{ minHeight: 20 }} />}
            </div>
            <p className={`pb-5 pt-0.5 text-sm ${done ? 'font-semibold' : 'text-muted'}`}>{s.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetail() {
  const id = Number(useParams().id);
  const placed = (useLocation().state as { placed?: boolean } | null)?.placed;

  const { data: order, isPending, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id),
    enabled: Number.isInteger(id),
    // Keeps the progress fresh while the shop works on it.
    refetchInterval: (q) => (q.state.data && ['pending', 'confirmed', 'ready'].includes(q.state.data.status) ? 30_000 : false),
  });

  if (isPending) return <div className="mx-auto max-w-3xl space-y-3 px-4 py-6"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  if (isError) {
    const notFound = (error as { response?: { status?: number } }).response?.status === 404;
    return notFound
      ? <EmptyState icon="box" title="Order not found" action={<Link to="/orders" className={buttonClass()}>My orders</Link>} />
      : <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <Seo title={`Order ${order.order_number}`} />
      <Link to="/orders" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-ink">
        <Icon name="chevronLeft" size={18} /> My orders
      </Link>

      {placed && (
        <div role="status" className="mt-3 flex gap-3 rounded-2xl bg-ok-soft p-4 text-ok">
          <Icon name="check" size={22} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Thank you! Your order is in.</p>
            <p className="text-sm">We will call you on {order.phone} to confirm. You can follow it here.</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
          <p className="text-sm text-muted">Placed {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5" aria-label="Progress">
        <Timeline order={order} />
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-5" aria-label="Items">
        <h2 className="mb-2 text-lg font-bold">Items</h2>
        <ul className="divide-y divide-line">
          {order.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-3 py-2.5 text-sm">
              <span>{i.qty} × {i.name}</span>
              <span className="font-semibold">{formatBr(i.qty * i.unit_price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-3">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold">{formatBr(order.total)}</span>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-5" aria-label="Delivery and payment">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{order.delivery_method === 'delivery' ? 'Delivery address' : 'Pickup'}</dt>
            <dd className="mt-0.5 font-semibold">{order.delivery_method === 'delivery' ? order.address : 'Collect from the shop'}</dd>
          </div>
          <div><dt className="text-muted">Payment</dt><dd className="mt-0.5 font-semibold">{PAYMENT_LABEL[order.payment_method]}</dd></div>
          <div><dt className="text-muted">Contact</dt><dd className="mt-0.5 font-semibold">{order.customer_name}, {order.phone}</dd></div>
          {order.note && <div><dt className="text-muted">Your note</dt><dd className="mt-0.5 font-semibold">{order.note}</dd></div>}
        </dl>
      </section>

      <a href={`tel:${SHOP_PHONE}`} className={`${buttonClass('secondary', 'lg')} mt-5 w-full`}>
        <Icon name="phone" size={18} /> Questions? Call {SHOP_PHONE_DISPLAY}
      </a>
    </div>
  );
}

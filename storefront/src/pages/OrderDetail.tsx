import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrder } from '../api/shop';
import { errorMessage } from '../api/client';
import { useT, type Key } from '../i18n';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';
import { formatBr, formatDate } from '../lib/format';
import type { Order } from '../types';
import { buttonClass } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { StatusBadge } from '../components/ui/StatusBadge';

const PAYMENT_KEY: Record<Order['payment_method'], Key> = { telebirr: 'pay.telebirr', cbe: 'pay.cbe', cash: 'pay.cash' };

function Timeline({ order }: { order: Order }) {
  const t = useT();
  const steps: { key: string; label: Key }[] = [
    { key: 'pending', label: 'od.received' },
    { key: 'confirmed', label: 'od.confirmedStep' },
    { key: 'ready', label: order.delivery_method === 'pickup' ? 'od.pickupReady' : 'od.onTheWay' },
    { key: 'delivered', label: 'od.completed' },
  ];
  const reached = steps.findIndex(s => s.key === order.status);

  if (order.status === 'cancelled') {
    return <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">{t('od.cancelledText')}</p>;
  }
  return (
    <ol className="space-y-0" aria-label={t('od.progress')}>
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
            <p className={`pb-5 pt-0.5 text-sm ${done ? 'font-semibold' : 'text-muted'}`}>{t(s.label)}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetail() {
  const t = useT();
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
      ? <EmptyState icon="box" title={t('od.notFound')} action={<Link to="/orders" className={buttonClass()}>{t('orders.title')}</Link>} />
      : <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <Seo title={order.order_number} />
      <PageHeader title={order.order_number} fallback="/orders"><StatusBadge status={order.status} /></PageHeader>
      <p className="mt-1 text-sm text-muted">{t('od.placed', { date: formatDate(order.created_at) })}</p>

      {placed && (
        <div role="status" className="mt-3 flex gap-3 rounded-2xl bg-ok-soft p-4 text-ok">
          <Icon name="check" size={22} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">{t('od.thanks')}</p>
            <p className="text-sm">{t('od.thanksText', { phone: order.phone })}</p>
          </div>
        </div>
      )}

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:mt-6 sm:p-5" aria-label={t('od.progress')}>
        <Timeline order={order} />
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label={t('od.items')}>
        <h2 className="mb-2 text-lg font-bold">{t('od.items')}</h2>
        <ul className="divide-y divide-line">
          {order.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0">{i.qty} × {i.name}</span>
              <span className="shrink-0 font-semibold">{formatBr(i.qty * i.unit_price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-3">
          <span className="font-semibold">{t('od.total')}</span>
          <span className="text-xl font-bold">{formatBr(order.total)}</span>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label={t('od.payment')}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{order.delivery_method === 'delivery' ? t('od.deliveryAddress') : t('od.pickup')}</dt>
            <dd className="mt-0.5 font-semibold">{order.delivery_method === 'delivery' ? order.address : t('od.collect')}</dd>
          </div>
          <div><dt className="text-muted">{t('od.payment')}</dt><dd className="mt-0.5 font-semibold">{t(PAYMENT_KEY[order.payment_method])}</dd></div>
          <div><dt className="text-muted">{t('od.contact')}</dt><dd className="mt-0.5 font-semibold">{order.customer_name}, {order.phone}</dd></div>
          {order.note && <div><dt className="text-muted">{t('od.yourNote')}</dt><dd className="mt-0.5 font-semibold">{order.note}</dd></div>}
        </dl>
      </section>

      <a href={`tel:${SHOP_PHONE}`} className={`${buttonClass('secondary', 'lg')} mt-5 w-full`}>
        <Icon name="phone" size={18} /> {t('od.questions', { phone: SHOP_PHONE_DISPLAY })}
      </a>
    </div>
  );
}

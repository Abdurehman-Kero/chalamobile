import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../api/shop';
import { errorMessage } from '../api/client';
import { useT } from '../i18n';
import { formatBr, timeAgo } from '../lib/format';
import { buttonClass } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { Seo } from '../components/ui/Seo';
import { StatusBadge } from '../components/ui/StatusBadge';

export default function Orders() {
  const t = useT();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ['orders'], queryFn: getOrders });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <Seo title={t('orders.title')} />
      <PageHeader title={t('orders.title')} fallback="/" />

      {isPending ? (
        <div className="mt-5 space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon="box" title={t('orders.none')} message={t('orders.noneText')}
          action={<Link to="/shop" className={buttonClass()}>{t('cart.start')}</Link>} />
      ) : (
        <ul className="mt-5 space-y-3 sm:mt-6">
          {data.map(o => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="block rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-card sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{o.order_number}</p>
                    <p className="text-sm text-muted">{timeAgo(o.created_at)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-3 truncate text-sm text-muted">{o.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</p>
                <p className="mt-2 text-base font-bold">{formatBr(o.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

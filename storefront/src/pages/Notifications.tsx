import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationsRead } from '../api/shop';
import { errorMessage } from '../api/client';
import { timeAgo } from '../lib/format';
import { buttonClass } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { Seo } from '../components/ui/Seo';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications, refetchInterval: 45_000 });
  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Looking at the page counts as reading. The badge clears a moment after the list appears,
  // so the unread ones are still highlighted while you look at them.
  const unread = data?.unread ?? 0;
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => markRead.mutate(), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6">
      <Seo title="Notifications" />
      <PageHeader title="Notifications" fallback="/" />

      {isPending ? (
        <div className="mt-6 space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data.notifications.length === 0 ? (
        <EmptyState icon="bell" title="Nothing new" message="Updates about your orders will appear here."
          action={<Link to="/shop" className={buttonClass()}>Keep shopping</Link>} />
      ) : (
        <ul className="mt-6 space-y-2.5">
          {data.notifications.map(n => {
            const body = (
              <div className={`flex gap-3 rounded-2xl border p-4 ${n.read_at ? 'border-line bg-surface' : 'border-brand/30 bg-brand-soft'}`}>
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.read_at ? 'bg-sunken text-muted' : 'bg-brand text-on-brand'}`}>
                  <Icon name="bell" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1.5 text-xs text-muted">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.order_id ? <Link to={`/orders/${n.order_id}`} className="block">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}

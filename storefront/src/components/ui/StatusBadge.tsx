import { useT, type Key } from '../../i18n';
import type { OrderStatus } from '../../types';

export const STATUS_KEY: Record<OrderStatus, Key> = {
  pending: 'status.pending',
  confirmed: 'status.confirmed',
  ready: 'status.ready',
  delivered: 'status.delivered',
  cancelled: 'status.cancelled',
};

const LOOK: Record<OrderStatus, string> = {
  pending: 'bg-warn-soft text-warn',
  confirmed: 'bg-brand-soft text-brand-ink',
  ready: 'bg-ok-soft text-ok',
  delivered: 'bg-ok-soft text-ok',
  cancelled: 'bg-sunken text-muted',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useT();
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${LOOK[status]}`}>{t(STATUS_KEY[status])}</span>;
}

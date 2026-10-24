import type { OrderStatus } from '../../types';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Waiting for confirmation',
  confirmed: 'Confirmed',
  ready: 'Ready',
  delivered: 'Completed',
  cancelled: 'Cancelled',
};

const LOOK: Record<OrderStatus, string> = {
  pending: 'bg-warn-soft text-warn',
  confirmed: 'bg-brand-soft text-brand-ink',
  ready: 'bg-ok-soft text-ok',
  delivered: 'bg-ok-soft text-ok',
  cancelled: 'bg-sunken text-muted',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${LOOK[status]}`}>{STATUS_LABEL[status]}</span>;
}

import type { StockState } from '../../types';

/** Stock is shown as a state, never an exact count. */
export function StockBadge({ state, compact = false }: { state: StockState; compact?: boolean }) {
  if (state === 'in' && compact) return null;
  const look = {
    in: { text: 'In stock', cls: 'bg-ok-soft text-ok' },
    low: { text: 'Few left', cls: 'bg-warn-soft text-warn' },
    out: { text: 'Sold out', cls: 'bg-sunken text-muted' },
  }[state];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${look.cls}`}>{look.text}</span>
  );
}

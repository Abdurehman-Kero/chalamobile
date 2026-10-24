import { useT, type Key } from '../../i18n';
import type { StockState } from '../../types';

const LOOK: Record<StockState, { text: Key; cls: string }> = {
  in: { text: 'stock.in', cls: 'bg-ok-soft text-ok' },
  low: { text: 'stock.low', cls: 'bg-warn-soft text-warn' },
  out: { text: 'stock.out', cls: 'bg-sunken text-muted' },
};

/** Stock is shown as a state, never an exact count. */
export function StockBadge({ state, compact = false }: { state: StockState; compact?: boolean }) {
  const t = useT();
  if (state === 'in' && compact) return null;
  const look = LOOK[state];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${look.cls}`}>{t(look.text)}</span>
  );
}

import { MAX_QTY } from '../../store/cart';
import { Icon } from './Icon';

interface Props { qty: number; setQty: (n: number) => void; disabled?: boolean; compact?: boolean }

export function QtyStepper({ qty, setQty, disabled, compact = false }: Props) {
  const btn = 'grid h-11 w-11 place-items-center rounded-lg text-ink hover:bg-sunken disabled:text-line-strong disabled:hover:bg-transparent';
  return (
    <div className={compact ? '' : 'flex flex-col gap-1'}>
      {!compact && <span className="text-xs font-semibold text-muted">Quantity</span>}
      <div className="inline-flex items-center rounded-xl border border-line-strong bg-surface" role="group" aria-label="Quantity">
        <button type="button" className={btn} onClick={() => setQty(Math.max(1, qty - 1))} disabled={disabled || qty <= 1} aria-label="Decrease quantity">
          <Icon name="minus" size={18} />
        </button>
        <span className="min-w-8 text-center text-[15px] font-semibold" aria-live="polite">{qty}</span>
        <button type="button" className={btn} onClick={() => setQty(Math.min(MAX_QTY, qty + 1))} disabled={disabled || qty >= MAX_QTY} aria-label="Increase quantity">
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

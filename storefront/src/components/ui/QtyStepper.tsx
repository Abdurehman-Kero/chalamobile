import { useT } from '../../i18n';
import { MAX_QTY } from '../../store/cart';
import { Icon } from './Icon';

interface Props { qty: number; setQty: (n: number) => void; disabled?: boolean; compact?: boolean; small?: boolean }

/** `compact` drops the label above; `small` makes the buttons smaller, for rows in the cart. */
export function QtyStepper({ qty, setQty, disabled, compact = false, small = false }: Props) {
  const t = useT();
  const size = small ? 'h-9 w-9' : 'h-11 w-11';
  const btn = `grid ${size} place-items-center rounded-lg text-ink hover:bg-sunken disabled:text-line-strong disabled:hover:bg-transparent`;
  return (
    <div className={compact ? '' : 'flex flex-col gap-1'}>
      {!compact && <span className="text-xs font-semibold text-muted">{t('p.qty')}</span>}
      <div className="inline-flex items-center rounded-xl border border-line-strong bg-surface" role="group" aria-label={t('p.qty')}>
        <button type="button" className={btn} onClick={() => setQty(Math.max(1, qty - 1))} disabled={disabled || qty <= 1} aria-label={t('p.dec')}>
          <Icon name="minus" size={16} />
        </button>
        <span className={`${small ? 'min-w-7 text-sm' : 'min-w-8 text-[15px]'} text-center font-semibold`} aria-live="polite">{qty}</span>
        <button type="button" className={btn} onClick={() => setQty(Math.min(MAX_QTY, qty + 1))} disabled={disabled || qty >= MAX_QTY} aria-label={t('p.inc')}>
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}

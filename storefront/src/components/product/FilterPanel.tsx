import { useState, type FormEvent } from 'react';
import type { Filters } from '../../api/shop';
import { categoryName, useT } from '../../i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export interface ShopFilters {
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  stock: boolean;
}

interface Props {
  filters: Filters | undefined;
  value: ShopFilters;
  onChange: (patch: Partial<ShopFilters>) => void;
  onClear: () => void;
}

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-line first:border-t-0">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between text-left text-[15px] font-bold">
        {title}
        <Icon name={open ? 'minus' : 'plus'} size={17} className="text-muted" />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </section>
  );
}

function Choice({ label, count, selected, onClick }: { label: string; count: number; selected: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} aria-pressed={selected}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-1 text-left text-sm hover:bg-sunken">
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? 'border-brand bg-brand text-on-brand' : 'border-line-strong bg-surface'}`}>
          {selected && <Icon name="check" size={14} />}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-xs text-muted">{count}</span>
      </button>
    </li>
  );
}

function PriceFields({ filters, value, onChange }: Pick<Props, 'filters' | 'value' | 'onChange'>) {
  const t = useT();
  const [min, setMin] = useState(value.min?.toString() ?? '');
  const [max, setMax] = useState(value.max?.toString() ?? '');
  const apply = (e: FormEvent) => {
    e.preventDefault();
    const lo = min === '' ? undefined : Math.max(0, Number(min));
    const hi = max === '' ? undefined : Math.max(0, Number(max));
    onChange({ min: lo, max: hi });
  };
  const input = 'h-11 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 text-sm focus:border-ink';
  return (
    <form onSubmit={apply}>
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('filter.lowest')}</span>
          <input className={input} inputMode="numeric" placeholder={`Br ${filters?.price.min ?? 0}`} value={min} onChange={e => setMin(e.target.value.replace(/\D/g, ''))} />
        </label>
        <span className="text-muted" aria-hidden="true">–</span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('filter.highest')}</span>
          <input className={input} inputMode="numeric" placeholder={`Br ${filters?.price.max ?? 0}`} value={max} onChange={e => setMax(e.target.value.replace(/\D/g, ''))} />
        </label>
      </div>
      <Button type="submit" variant="secondary" size="sm" className="mt-3 w-full">{t('filter.apply')}</Button>
    </form>
  );
}

/** The filter list, used in the sidebar on wide screens and in the slide-up sheet on phones. */
export function FilterPanel({ filters, value, onChange, onClear }: Props) {
  const t = useT();
  const active = [value.category, value.brand, value.min, value.max, value.stock || undefined].filter(v => v !== undefined).length;
  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-lg font-bold">{t('filter.title')}</h2>
        {active > 0 && <button type="button" onClick={onClear} className="min-h-10 px-1 text-sm font-semibold text-link hover:underline">{t('list.clearAll')}</button>}
      </div>

      <Group title={t('filter.availability')}>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={value.stock} onChange={e => onChange({ stock: e.target.checked })} className="h-5 w-5 rounded accent-[var(--color-brand)]" />
          {t('filter.inStockOnly')}
        </label>
      </Group>

      <Group title={t('filter.price')}>
        {/* Remounts when the price changes elsewhere (for example, Clear all). */}
        <PriceFields key={`${value.min ?? ''}-${value.max ?? ''}`} filters={filters} value={value} onChange={onChange} />
      </Group>

      <Group title={t('filter.category')}>
        <ul>
          {filters?.categories.map(c => (
            <Choice key={c.name} label={categoryName(t, c.name)} count={c.count} selected={value.category === c.name}
              onClick={() => onChange({ category: value.category === c.name ? undefined : c.name })} />
          ))}
        </ul>
      </Group>

      {filters && filters.brands.length > 1 && (
        <Group title={t('filter.brand')} defaultOpen={false}>
          <ul>
            {filters.brands.map(b => (
              <Choice key={b.name} label={b.name} count={b.count} selected={value.brand === b.name}
                onClick={() => onChange({ brand: value.brand === b.name ? undefined : b.name })} />
            ))}
          </ul>
        </Group>
      )}
    </div>
  );
}

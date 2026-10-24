import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getFilters, getProducts } from '../api/shop';
import { errorMessage } from '../api/client';
import { formatBr } from '../lib/format';
import type { Sort, Tab } from '../types';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Seo } from '../components/ui/Seo';
import { EmptyState, ErrorState, SlowHint, useSlowHint } from '../components/ui/States';
import { FilterPanel, type ShopFilters } from '../components/product/FilterPanel';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'top', label: 'Top selling' },
  { key: 'featured', label: 'Featured' },
  { key: 'new', label: 'New arrivals' },
];
const SORTS: { key: Sort; label: string }[] = [
  { key: 'name', label: 'Name (A to Z)' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
  { key: 'new', label: 'Newest first' },
];
const PAGE_SIZE = 12;

const num = (v: string | null) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** Phones: the filters slide up from the bottom. */
function FilterSheet({ open, onClose, children, resultCount }: { open: boolean; onClose: () => void; children: React.ReactNode; resultCount: string }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = previous; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div className="rise absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="font-bold">Filters</p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-sunken"><Icon name="x" /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-4 pt-2">{children}</div>
        <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button size="lg" className="w-full" onClick={onClose}>Show {resultCount}</Button>
        </div>
      </div>
    </div>
  );
}

/** Browse everything, a category, or search results. Every filter lives in the address, so a link shares the view. */
export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);

  const q = params.get('q')?.trim() || undefined;
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some(t => t.key === tabParam) ? tabParam : 'all';
  const sortParam = params.get('sort') as Sort | null;
  const sort: Sort = sortParam && SORTS.some(s => s.key === sortParam) ? sortParam : 'name';
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  const value: ShopFilters = {
    category: params.get('category') || undefined,
    brand: params.get('brand') || undefined,
    min: num(params.get('min')),
    max: num(params.get('max')),
    stock: params.get('stock') === '1',
  };

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v === undefined || v === '') next.delete(k); else next.set(k, v); }
    setParams(next, { replace: true });
  };
  const onFilterChange = (p: Partial<ShopFilters>) => update({
    ...('category' in p ? { category: p.category } : {}),
    ...('brand' in p ? { brand: p.brand } : {}),
    ...('min' in p ? { min: p.min?.toString() } : {}),
    ...('max' in p ? { max: p.max?.toString() } : {}),
    ...('stock' in p ? { stock: p.stock ? '1' : undefined } : {}),
  });
  const clearFilters = () => update({ category: undefined, brand: undefined, min: undefined, max: undefined, stock: undefined });
  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const filters = useQuery({ queryKey: ['filters'], queryFn: getFilters, staleTime: 5 * 60_000 });

  const key = { q, ...value, tab, sort: tab === 'all' ? sort : tab };
  const query = useInfiniteQuery({
    queryKey: ['shop', key],
    queryFn: ({ pageParam }) => getProducts({
      q, category: value.category, brand: value.brand, min_price: value.min, max_price: value.max,
      in_stock: value.stock ? 1 : undefined, tab, sort: tab === 'all' ? sort : undefined, page: pageParam, limit: PAGE_SIZE,
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });
  const slow = useSlowHint(query.isPending);

  const products = query.data?.pages.flatMap(p => p.products) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const activeCount = [value.category, value.brand, value.min, value.max, value.stock || undefined].filter(v => v !== undefined).length;
  const title = q ? `Results for "${q}"` : value.category ?? 'All products';

  const chips: { label: string; clear: () => void }[] = [];
  if (q) chips.push({ label: `"${q}"`, clear: () => update({ q: undefined }) });
  if (value.category) chips.push({ label: value.category, clear: () => update({ category: undefined }) });
  if (value.brand) chips.push({ label: value.brand, clear: () => update({ brand: undefined }) });
  if (value.min !== undefined || value.max !== undefined) {
    chips.push({ label: `${value.min !== undefined ? formatBr(value.min) : 'Any'} – ${value.max !== undefined ? formatBr(value.max) : 'Any'}`, clear: () => update({ min: undefined, max: undefined }) });
  }
  if (value.stock) chips.push({ label: 'In stock', clear: () => update({ stock: undefined }) });

  // Sort and layout controls: shown beside the tabs on wide screens, in their own row elsewhere.
  const controls = (
    <>
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted lg:flex-none">
        <span className="sr-only sm:not-sr-only">Sort</span>
        <select value={sort} disabled={tab !== 'all'} onChange={e => update({ sort: e.target.value === 'name' ? undefined : e.target.value })}
          className="min-h-10 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink disabled:opacity-50 lg:w-auto">
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <div className="flex rounded-xl bg-sunken p-1" role="group" aria-label="Layout">
        {(['grid', 'list'] as const).map(v => (
          <button key={v} type="button" aria-pressed={view === v} aria-label={v === 'grid' ? 'Grid view' : 'List view'} onClick={() => update({ view: v === 'grid' ? undefined : 'list' })}
            className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${view === v ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'}`}>
            <Icon name={v === 'grid' ? 'grid' : 'list'} size={18} />
          </button>
        ))}
      </div>
    </>
  );

  const grid = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4';
  const panel = <FilterPanel filters={filters.data} value={value} onChange={onFilterChange} onClear={clearFilters} />;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-5 sm:px-6 lg:px-8">
      <Seo title={q ? `Search: ${q}` : value.category ?? 'Shop'} description={`Browse ${value.category ?? 'all products'} at Chala Mobile.`} />
      <PageHeader title={title} note={query.isPending ? undefined : `${total} ${total === 1 ? 'product' : 'products'}`} fallback="/" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
        <aside className="hidden self-start rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-[calc(var(--header-h,64px)+16px)] lg:block" aria-label="Filters">
          {panel}
        </aside>

        <div className="min-w-0">
          {/* Views: sticks under the header while scrolling. */}
          <div className="sticky top-[var(--header-h,0px)] z-20 -mx-4 border-b border-line bg-surface/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-2xl lg:border lg:px-3">
            <div role="tablist" aria-label="Product views" className="rail flex gap-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => update({ tab: t.key === 'all' ? undefined : t.key })}
                  className={`relative min-h-12 shrink-0 px-3.5 text-sm font-semibold transition-colors ${tab === t.key ? 'text-ink' : 'text-muted hover:text-ink'}`}>
                  {t.label}
                  {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
                </button>
              ))}
            </div>
            {/* Wide screens: the controls share the tab row. */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">{controls}</div>
          </div>

          {/* Phones and tablets: a row of its own. */}
          <div className="flex items-center gap-2 py-3 lg:hidden">
            <Button variant="secondary" size="sm" onClick={() => setSheet(true)}>
              <Icon name="sliders" size={17} /> Filters{activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-bold text-on-brand">{activeCount}</span>}
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-2">{controls}</div>
          </div>
          <div className="hidden h-4 lg:block" />

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map(c => (
                <button key={c.label} type="button" onClick={c.clear} aria-label={`Remove filter ${c.label}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-soft pl-3 pr-2 text-sm font-semibold text-brand-ink hover:bg-brand/30">
                  {c.label} <Icon name="x" size={14} />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="min-h-9 px-2 text-sm font-semibold text-link hover:underline">Clear all</button>
            </div>
          )}

          {query.isPending ? (
            <>
              <div className={grid}>{Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
              <SlowHint show={slow} />
            </>
          ) : query.isError ? (
            <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
          ) : products.length === 0 ? (
            <EmptyState icon="search" title="Nothing found"
              message={q ? `We couldn't find anything for "${q}".` : 'No products match these filters.'}
              action={<Button onClick={clearAll}>Clear all filters</Button>} />
          ) : (
            <>
              {view === 'grid'
                ? <div className={grid}>{products.map(p => <ProductCard key={p.id} product={p} showSold={tab !== 'new'} />)}</div>
                : <div className="space-y-3">{products.map(p => <ProductCard key={p.id} product={p} row showSold={tab !== 'new'} />)}</div>}
              <div className="mt-8 space-y-2 text-center">
                <p className="text-sm text-muted">Showing {products.length} of {total}</p>
                {query.hasNextPage && (
                  <button type="button" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}
                    className="min-h-12 w-full rounded-xl border border-ink bg-surface text-[15px] font-semibold transition-colors hover:bg-ink hover:text-white disabled:opacity-60">
                    {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} resultCount={query.isPending ? 'results' : `${total} ${total === 1 ? 'result' : 'results'}`}>
        {panel}
      </FilterSheet>
    </div>
  );
}

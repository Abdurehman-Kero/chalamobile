import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/shop';
import { errorMessage } from '../../api/client';
import type { Sort, Tab } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, SlowHint, useSlowHint } from '../ui/States';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

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

interface Props {
  title: string;
  subtitle?: string;
  q?: string;
  category?: string;
  initialTab?: Tab;
  onClearFilters?: () => void;
}

/**
 * The full product list, one long vertical grid. A tab bar (All / Top selling / Featured / New)
 * sticks under the header while scrolling, and "Show more" loads the next page.
 */
export function ProductExplorer({ title, subtitle, q, category, initialTab = 'all', onClearFilters }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<Sort>('name');

  const query = useInfiniteQuery({
    queryKey: ['products', { q, category, tab, sort: tab === 'all' ? sort : tab }],
    queryFn: ({ pageParam }) => getProducts({ q, category, tab, sort: tab === 'all' ? sort : undefined, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });
  const slow = useSlowHint(query.isPending);

  const products = query.data?.pages.flatMap(p => p.products) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <section id="explore" className="mt-12 scroll-mt-24 sm:mt-14" aria-label={title}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="sticky top-[var(--header-h,0px)] z-20 mt-3 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div role="tablist" aria-label="Product views" className="rail flex flex-1 gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`relative min-h-12 shrink-0 px-3.5 text-sm font-semibold transition-colors ${tab === t.key ? 'text-brand' : 'text-muted hover:text-ink'}`}
              >
                {t.label}
                {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
              </button>
            ))}
          </div>
          {tab === 'all' && (
            <label className="hidden shrink-0 items-center gap-2 text-sm text-muted sm:flex">
              <span className="sr-only sm:not-sr-only">Sort</span>
              <select
                value={sort} onChange={e => setSort(e.target.value as Sort)}
                className="min-h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink"
              >
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div role="tabpanel" className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        {tab === 'all' && (
          <div className="mb-4 flex items-center justify-between sm:hidden">
            <p className="text-sm text-muted">{query.isPending ? 'Loading…' : `${total} ${total === 1 ? 'product' : 'products'}`}</p>
            <label className="flex items-center gap-2 text-sm text-muted">
              <span>Sort</span>
              <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="min-h-10 rounded-lg border border-line-strong bg-surface px-2 text-sm text-ink">
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          </div>
        )}

        {query.isPending ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
            <SlowHint show={slow} />
          </>
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="search" title="Nothing found"
            message={q ? `We couldn't find anything for "${q}".` : 'No products here yet. Check back soon.'}
            action={onClearFilters && <Button onClick={onClearFilters}>Clear search</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {products.map(p => <ProductCard key={p.id} product={p} showSold={tab !== 'new'} />)}
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-sm text-muted">Showing {products.length} of {total}</p>
              {query.hasNextPage && (
                <Button variant="secondary" size="lg" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? 'Loading…' : 'Show more'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/shop';
import { errorMessage } from '../../api/client';
import { useT, type Key } from '../../i18n';
import type { Sort, Tab } from '../../types';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState, ErrorState, PageLoader } from '../ui/States';
import { ProductCard } from './ProductCard';

const TABS: { key: Tab; label: Key }[] = [
  { key: 'all', label: 'tab.all' },
  { key: 'top', label: 'tab.top' },
  { key: 'featured', label: 'tab.featured' },
  { key: 'new', label: 'tab.new' },
];

const SORTS: { key: Sort; label: Key }[] = [
  { key: 'name', label: 'sort.name' },
  { key: 'price_asc', label: 'sort.priceAsc' },
  { key: 'price_desc', label: 'sort.priceDesc' },
  { key: 'new', label: 'sort.newest' },
];

const PAGE_SIZE = 48;

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
 * sticks under the header while scrolling, and "Load more" loads the next page.
 */
export function ProductExplorer({ title, subtitle, q, category, initialTab = 'all', onClearFilters }: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<Sort>('name');

  const query = useInfiniteQuery({
    queryKey: ['products', { q, category, tab, sort: tab === 'all' ? sort : tab }],
    queryFn: ({ pageParam }) => getProducts({ q, category, tab, sort: tab === 'all' ? sort : undefined, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });

  // Show every product: keep asking for the next page until there are no more.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const products = query.data?.pages.flatMap(p => p.products) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const sortSelect = (
    <select
      value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label={t('sort.label')}
      className="min-h-10 min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink"
    >
      {SORTS.map(s => <option key={s.key} value={s.key}>{t(s.label)}</option>)}
    </select>
  );

  return (
    <section id="explore" className="mt-10 scroll-mt-24 sm:mt-14" aria-label={title}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted sm:text-sm">{subtitle}</p>}
      </div>

      <div className="sticky top-[var(--header-h,0px)] z-20 mt-3 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div role="tablist" aria-label={t('tab.aria')} className="rail flex flex-1 gap-0.5 overflow-x-auto sm:gap-1">
            {TABS.map(x => (
              <button
                key={x.key} type="button" role="tab" aria-selected={tab === x.key}
                onClick={() => setTab(x.key)}
                className={`relative min-h-11 shrink-0 px-3 text-[13px] font-semibold transition-colors sm:min-h-12 sm:px-3.5 sm:text-sm ${tab === x.key ? 'text-brand-ink' : 'text-muted hover:text-ink'}`}
              >
                {t(x.label)}
                {tab === x.key && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
              </button>
            ))}
          </div>
          {tab === 'all' && <div className="hidden shrink-0 sm:block">{sortSelect}</div>}
        </div>
      </div>

      <div role="tabpanel" className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        {tab === 'all' && (
          <div className="mb-3 flex items-center justify-between gap-3 sm:hidden">
            <p className="text-sm text-muted">{query.isPending ? t('common.loading') : total === 1 ? t('list.oneProduct') : t('list.nProducts', { n: total })}</p>
            {sortSelect}
          </div>
        )}

        {query.isPending ? (
          <PageLoader compact />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="search" title={t('list.nothing')}
            message={q ? t('list.noneFor', { q }) : t('list.empty')}
            action={onClearFilters && <Button onClick={onClearFilters}>{t('list.clearAll')}</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {products.map(p => <ProductCard key={p.id} product={p} showSold={tab !== 'new'} />)}
            </div>
            {query.hasNextPage && <div className="mt-6 flex justify-center sm:mt-8"><Spinner size={28} className="text-ink" /></div>}
          </>
        )}
      </div>
    </section>
  );
}

import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../../api/shop';
import { Skeleton } from '../ui/States';

/** Horizontally swipeable category chips under the header. */
export function CategoryBar() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const active = pathname === '/shop' ? params.get('category') ?? '' : null;
  const { data, isPending } = useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: 5 * 60_000 });

  const chip = (selected: boolean) =>
    `inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
      selected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink hover:bg-sunken'
    }`;

  return (
    <nav aria-label="Categories" className="mx-auto max-w-7xl">
      <div className="rail flex gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/shop" className={chip(active === '')}>All products</Link>
        {isPending
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />)
          : data?.map(c => (
            <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`} className={chip(active === c.name)}>
              {c.name}
            </Link>
          ))}
      </div>
    </nav>
  );
}

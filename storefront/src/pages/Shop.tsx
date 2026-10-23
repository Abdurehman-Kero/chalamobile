import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Tab } from '../types';
import { Seo } from '../components/ui/Seo';
import { ProductExplorer } from '../components/product/ProductExplorer';

const TABS: Tab[] = ['all', 'top', 'featured', 'new'];

/** Browse everything, a single category, or search results. The filters live in the address. */
export default function Shop() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q')?.trim() || undefined;
  const category = params.get('category') || undefined;
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'all';

  const title = q ? `Results for "${q}"` : category ?? 'All products';

  return (
    <div>
      <Seo title={q ? `Search: ${q}` : category ?? 'Shop'} description={`Browse ${category ?? 'all products'} at Chala Mobile.`} />
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link to="/" className="hover:text-ink">Home</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink">Shop</span>
        </nav>
      </div>
      <ProductExplorer
        key={`${q ?? ''}|${category ?? ''}|${tab}`}
        title={title}
        q={q}
        category={category}
        initialTab={tab}
        onClearFilters={() => navigate('/shop')}
      />
    </div>
  );
}

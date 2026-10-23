import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { formatBr, productPath } from '../../lib/format';
import { useCart } from '../../store/cart';
import { useToast } from '../../store/toast';
import { Icon } from '../ui/Icon';
import { ProductImage } from './ProductImage';
import { StockBadge } from './StockBadge';

interface Props {
  product: Product;
  /** Shows a "Top selling" badge for products that have sold recently. */
  showSold?: boolean;
  /** Sizes the card in a horizontal rail instead of a grid cell. */
  rail?: boolean;
}

export function ProductCard({ product, showSold = false, rail = false }: Props) {
  const add = useCart(s => s.add);
  const show = useToast(s => s.show);
  const out = product.stock === 'out';

  const quickAdd = () => {
    add(product);
    show(`${product.name} added to your cart`, { label: 'View cart', to: '/cart' });
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card transition-shadow hover:shadow-pop ${rail ? 'w-[44vw] max-w-[220px] shrink-0 snap-start sm:w-[200px] lg:w-[220px]' : ''}`}
    >
      <Link to={productPath(product.id)} className="flex flex-1 flex-col" aria-label={`${product.name}, ${formatBr(product.price)}`}>
        <div className="relative aspect-square">
          <ProductImage
            src={product.image} alt="" width={400}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 46vw"
            className={`h-full w-full p-2 transition-transform duration-300 group-hover:scale-[1.03] ${out ? 'opacity-60' : ''}`}
          />
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {showSold && product.sold > 0 && !out && (
              <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">Top selling</span>
            )}
            <StockBadge state={product.stock} compact />
          </div>
        </div>
        <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
          {product.brand && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{product.brand}</p>}
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{product.name}</h3>
          {product.specs && <p className="mt-0.5 truncate text-xs text-muted">{product.specs}</p>}
          <p className="mt-2 text-base font-bold">{formatBr(product.price)}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={quickAdd}
        disabled={out}
        aria-label={out ? `${product.name} is sold out` : `Add ${product.name} to cart`}
        className="absolute bottom-2.5 right-2.5 grid h-11 w-11 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted"
      >
        <Icon name={out ? 'x' : 'plus'} size={20} />
      </button>
    </article>
  );
}

export function ProductCardSkeleton({ rail = false }: { rail?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface ${rail ? 'w-[44vw] max-w-[220px] shrink-0 sm:w-[200px] lg:w-[220px]' : ''}`} aria-hidden="true">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { categoryName, useT } from '../../i18n';
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
  /** A wide row (photo on the left) instead of a tall card. */
  row?: boolean;
}

const RAIL = 'w-[44vw] max-w-[220px] shrink-0 snap-start sm:w-[210px] lg:w-[230px]';

/** Add to cart: the one amber action on a product. Smaller on phones, so a card is not crowded. */
function CartButton({ product }: { product: Product }) {
  const t = useT();
  const add = useCart(s => s.add);
  const show = useToast(s => s.show);
  const out = product.stock === 'out';
  return (
    <button
      type="button"
      onClick={() => { add(product); show(t('toast.added', { name: product.name }), { label: t('toast.viewCart'), to: '/cart' }); }}
      disabled={out}
      aria-label={out ? t('card.soldOut', { name: product.name }) : t('card.add', { name: product.name })}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink transition-colors hover:bg-brand hover:text-on-brand disabled:bg-sunken disabled:text-muted sm:h-11 sm:w-11 sm:rounded-xl"
    >
      <Icon name={out ? 'x' : 'cart'} size={19} />
    </button>
  );
}

export function ProductCard({ product, showSold = false, rail = false, row = false }: Props) {
  const t = useT();
  const out = product.stock === 'out';
  const label = product.brand || (product.category ? categoryName(t, product.category) : '');
  const topBadge = showSold && product.sold > 0 && !out;

  if (row) {
    return (
      <article className="group flex min-w-0 gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-2.5 shadow-card transition-shadow hover:shadow-pop sm:gap-5 sm:p-4">
        <Link to={productPath(product.id)} className="relative block w-24 shrink-0 sm:w-40" aria-label={product.name}>
          <ProductImage src={product.image} alt="" width={320} sizes="160px" className={`aspect-square w-full rounded-xl ${out ? 'opacity-60' : ''}`} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <Link to={productPath(product.id)} className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug hover:underline sm:text-base">{product.name}</Link>
          {product.specs && <p className="mt-0.5 truncate text-[13px] text-muted sm:text-sm">{product.specs}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StockBadge state={product.stock} />
            {topBadge && <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">{t('badge.top')}</span>}
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <p className="text-lg font-bold tracking-tight sm:text-xl">{formatBr(product.price)}</p>
            <CartButton product={product} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop ${rail ? RAIL : ''}`}
    >
      <Link to={productPath(product.id)} className="flex flex-1 flex-col" aria-label={`${product.name}, ${formatBr(product.price)}`}>
        <div className="relative">
          <ProductImage
            src={product.image} alt="" width={400}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 46vw"
            className={`aspect-square w-full ${out ? 'opacity-60' : ''}`}
            imgClassName="transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1 sm:left-2 sm:top-2">
            {topBadge && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm sm:px-2 sm:text-[11px]">{t('badge.top')}</span>}
            <StockBadge state={product.stock} compact />
          </div>
        </div>
        <div className="px-2.5 pt-2 sm:px-3.5 sm:pt-3">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-[11px]">{label || ' '}</p>
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-[1.2rem] sm:min-h-[2.5rem] sm:text-[15px] sm:leading-5">{product.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{product.specs || ' '}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-1.5 px-2.5 pb-2.5 pt-1.5 sm:gap-2 sm:px-3.5 sm:pb-3.5 sm:pt-2.5">
        <p className="min-w-0 truncate text-[15px] font-bold tracking-tight sm:text-lg">{formatBr(product.price)}</p>
        <CartButton product={product} />
      </div>
    </article>
  );
}

export function ProductCardSkeleton({ rail = false }: { rail?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-surface ${rail ? RAIL : ''}`} aria-hidden="true">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-5 w-1/2" />
      </div>
    </div>
  );
}

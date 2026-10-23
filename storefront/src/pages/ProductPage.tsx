import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProduct } from '../api/shop';
import { errorMessage } from '../api/client';
import { SHOP_PHONE } from '../lib/config';
import { formatBr } from '../lib/format';
import { useCart } from '../store/cart';
import { useToast } from '../store/toast';
import type { ProductDetail } from '../types';
import { Button, buttonClass } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { QtyStepper } from '../components/ui/QtyStepper';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';
import { ProductCard } from '../components/product/ProductCard';
import { Rail } from '../components/product/Rail';
import { StockBadge } from '../components/product/StockBadge';

function Gallery({ product }: { product: ProductDetail }) {
  const [index, setIndex] = useState(0);
  const images = product.images.length ? product.images : [{ id: 0, url: product.image ?? '' }];
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-line bg-sunken">
        <ProductImage
          key={current?.url} src={current?.url || null} alt={product.name} width={1000} eager
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="aspect-square w-full bg-transparent p-4 sm:p-8"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2" role="tablist" aria-label="Product photos">
          {images.map((img, i) => (
            <button
              key={img.id} type="button" role="tab" aria-selected={i === index} aria-label={`Photo ${i + 1} of ${images.length}`}
              onClick={() => setIndex(i)}
              className={`h-16 w-16 overflow-hidden rounded-xl border-2 bg-sunken sm:h-20 sm:w-20 ${i === index ? 'border-brand' : 'border-transparent hover:border-line-strong'}`}
            >
              <ProductImage src={img.url} alt="" width={160} className="h-full w-full bg-transparent p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Specs({ product }: { product: ProductDetail }) {
  const rows: [string, string][] = [];
  if (product.brand) rows.push(['Brand', product.brand]);
  if (product.category) rows.push(['Category', product.category]);
  if (product.storage_gb) rows.push(['Storage', `${product.storage_gb} GB`]);
  if (product.ram_gb) rows.push(['Memory (RAM)', `${product.ram_gb} GB`]);
  if (product.specs) rows.push(['Details', product.specs]);
  if (!rows.length) return null;
  return (
    <section className="mt-8" aria-label="Specifications">
      <h2 className="mb-3 text-lg font-bold">Specifications</h2>
      <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function ProductPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const add = useCart(s => s.add);
  const show = useToast(s => s.show);
  const [qty, setQty] = useState(1);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: Number.isInteger(id),
    retry: (count, err) => !(err as { response?: { status?: number } }).response && count < 2,
  });

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-4/5" /><Skeleton className="h-8 w-40" /><Skeleton className="h-24" /></div>
      </div>
    );
  }
  if (isError) {
    const notFound = (error as { response?: { status?: number } }).response?.status === 404;
    return notFound
      ? <EmptyState icon="search" title="Product not found" message="It may have been sold out and removed." action={<Link className={buttonClass()} to="/shop">Browse the shop</Link>} />
      : <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  const { product, related } = data;
  const out = product.stock === 'out';

  const addToCart = () => {
    add(product, qty);
    show(`${product.name} added to your cart`, { label: 'View cart', to: '/cart' });
  };
  const buyNow = () => { add(product, qty); navigate('/cart'); };

  return (
    <div className="pb-28 lg:pb-8">
      <Seo title={product.name} description={`${product.name} for ${formatBr(product.price)} at Chala Mobile.`} />
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <Link to="/" className="hover:text-ink">Home</Link><span aria-hidden="true"> / </span>
          {product.category
            ? <><Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-ink">{product.category}</Link><span aria-hidden="true"> / </span></>
            : null}
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Gallery product={product} />

          <div>
            {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{product.brand}</p>}
            <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>
            {product.specs && <p className="mt-1 text-muted">{product.specs}</p>}

            <div className="mt-4 flex items-center gap-3">
              <p className="text-3xl font-bold">{formatBr(product.price)}</p>
              <StockBadge state={product.stock} />
            </div>

            <div className="mt-6 hidden items-end gap-4 lg:flex">
              <QtyStepper qty={qty} setQty={setQty} disabled={out} />
              <Button size="lg" className="flex-1" onClick={addToCart} disabled={out}>
                <Icon name="cart" size={19} /> {out ? 'Sold out' : 'Add to cart'}
              </Button>
              <Button size="lg" variant="secondary" onClick={buyNow} disabled={out}>Buy now</Button>
            </div>

            <ul className="mt-6 space-y-3 rounded-2xl border border-line bg-surface p-4 text-sm">
              <li className="flex gap-3"><Icon name="truck" size={20} className="shrink-0 text-brand" /><span>Choose delivery or pickup at checkout. We confirm the details by phone.</span></li>
              <li className="flex gap-3"><Icon name="wallet" size={20} className="shrink-0 text-brand" /><span>Pay with Telebirr, CBE or cash.</span></li>
              <li className="flex gap-3">
                <Icon name="phone" size={20} className="shrink-0 text-brand" />
                <span>Questions? <a href={`tel:${SHOP_PHONE}`} className="font-semibold text-brand underline underline-offset-2">Call the shop</a></span>
              </li>
            </ul>

            <Specs product={product} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <Rail title="You may also like" subtitle={product.category ? `More ${product.category.toLowerCase()}` : undefined}>
          {related.map(p => <ProductCard key={p.id} product={p} rail />)}
        </Rail>
      )}

      {/* Phones: the buying actions stay within thumb reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <QtyStepper qty={qty} setQty={setQty} disabled={out} compact />
          <Button className="flex-1 whitespace-nowrap px-3" size="lg" onClick={addToCart} disabled={out}>{out ? 'Sold out' : 'Add to cart'}</Button>
          <Button variant="secondary" size="lg" className="px-4" onClick={buyNow} disabled={out}>Buy</Button>
        </div>
      </div>
    </div>
  );
}

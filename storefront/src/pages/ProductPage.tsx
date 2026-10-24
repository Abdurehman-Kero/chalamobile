import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProduct } from '../api/shop';
import { errorMessage } from '../api/client';
import { SHOP_NAME, SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';
import { formatBr } from '../lib/format';
import { useCart } from '../store/cart';
import { useRecent } from '../store/recent';
import { useToast } from '../store/toast';
import type { ProductDetail } from '../types';
import { Button, buttonClass } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { QtyStepper } from '../components/ui/QtyStepper';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';
import { ProductCard } from '../components/product/ProductCard';
import { Rail } from '../components/product/Rail';
import { StockBadge } from '../components/product/StockBadge';

/** The main photo, with a column of thumbnails beside it on wide screens and a row under it on phones. */
function Gallery({ product }: { product: ProductDetail }) {
  const [index, setIndex] = useState(0);
  const images = product.images.length ? product.images : [{ id: 0, url: product.image ?? '' }];
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-line">
        <ProductImage
          key={current?.url} src={current?.url || null} alt={product.name} width={1000} eager
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="aspect-square w-full"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" role="tablist" aria-label="Product photos">
          {images.map((img, i) => (
            <button
              key={img.id} type="button" role="tab" aria-selected={i === index} aria-label={`Photo ${i + 1} of ${images.length}`}
              onClick={() => setIndex(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-20 ${i === index ? 'border-brand' : 'border-transparent hover:border-line-strong'}`}
            >
              <ProductImage src={img.url} alt="" width={160} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Details({ product }: { product: ProductDetail }) {
  const rows: [string, string][] = [];
  if (product.brand) rows.push(['Brand', product.brand]);
  if (product.category) rows.push(['Category', product.category]);
  if (product.storage_gb) rows.push(['Storage', `${product.storage_gb} GB`]);
  if (product.ram_gb) rows.push(['Memory (RAM)', `${product.ram_gb} GB`]);
  if (product.specs) rows.push(['Details', product.specs]);
  if (!rows.length) return <p className="text-muted">No more details for this product yet. Call the shop and we will tell you everything.</p>;
  return (
    <dl className="grid max-w-2xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Delivery() {
  return (
    <ul className="max-w-2xl space-y-3 text-[15px]">
      <li className="flex gap-3"><Icon name="truck" size={20} className="mt-0.5 shrink-0 text-brand-ink" /><span><b>Delivery or pickup.</b> Choose at checkout. We confirm the details with you by phone.</span></li>
      <li className="flex gap-3"><Icon name="wallet" size={20} className="mt-0.5 shrink-0 text-brand-ink" /><span><b>Pay your way.</b> Telebirr, CBE or cash. No payment is taken online; we call you first.</span></li>
      <li className="flex gap-3"><Icon name="phone" size={20} className="mt-0.5 shrink-0 text-brand-ink" /><span><b>Questions?</b> Call <a href={`tel:${SHOP_PHONE}`} className="font-semibold text-link underline underline-offset-2">{SHOP_PHONE_DISPLAY}</a>.</span></li>
    </ul>
  );
}

export default function ProductPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const add = useCart(s => s.add);
  const show = useToast(s => s.show);
  const view = useRecent(s => s.view);
  const recent = useRecent(s => s.items);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'details' | 'delivery'>('details');

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: Number.isInteger(id),
    retry: (count, err) => !(err as { response?: { status?: number } }).response && count < 2,
  });

  // Remember this product for the "Recently viewed" row.
  const loaded = data?.product;
  useEffect(() => {
    if (!loaded) return;
    const { storage_gb, ram_gb, images, ...card } = loaded;
    void storage_gb; void ram_gb; void images;
    view(card);
  }, [loaded, view]);

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="space-y-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-4/5" /><Skeleton className="h-40" /></div>
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
  const seen = recent.filter(p => p.id !== product.id).slice(0, 8);

  const addToCart = () => {
    add(product, qty);
    show(`${product.name} added to your cart`, { label: 'View cart', to: '/cart' });
  };
  const buyNow = () => { add(product, qty); navigate('/cart'); };

  const tabBtn = (key: 'details' | 'delivery', label: string) => (
    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={`relative min-h-12 px-4 text-[15px] font-semibold transition-colors ${tab === key ? 'text-ink' : 'text-muted hover:text-ink'}`}>
      {label}
      {tab === key && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
    </button>
  );

  return (
    <div className="pb-28 lg:pb-8">
      <Seo title={product.name} description={`${product.name} for ${formatBr(product.price)} at Chala Mobile.`} />
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <PageHeader title={product.name} fallback="/shop" />

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,420px)] lg:items-start lg:justify-center lg:gap-12">
          <Gallery product={product} />

          <div className="space-y-4 lg:sticky lg:top-[calc(var(--header-h,64px)+16px)]">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{product.brand}</p>}
              {product.specs && <p className="mt-0.5 text-sm text-muted">{product.specs}</p>}
              <p className="mt-2 text-3xl font-bold tracking-tight">{formatBr(product.price)}</p>
              <div className="mt-2"><StockBadge state={product.stock} /></div>

              <div className="mt-5"><QtyStepper qty={qty} setQty={setQty} disabled={out} /></div>

              <div className="mt-5 hidden gap-3 lg:flex">
                <Button size="lg" className="flex-1" onClick={addToCart} disabled={out}>
                  <Icon name="cart" size={19} /> {out ? 'Sold out' : 'Add to cart'}
                </Button>
                <Button size="lg" variant="secondary" onClick={buyNow} disabled={out}>Buy now</Button>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand"><Icon name="store" size={21} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{SHOP_NAME}</p>
                <p className="text-xs text-muted">Sold and confirmed by the shop</p>
              </div>
              <a href={`tel:${SHOP_PHONE}`} className={buttonClass('secondary', 'sm', 'shrink-0')}><Icon name="phone" size={16} /> Call</a>
            </div>
          </div>
        </div>

        <section className="mt-10" aria-label="More about this product">
          <div role="tablist" className="flex border-b border-line">
            {tabBtn('details', 'Details')}
            {tabBtn('delivery', 'Delivery and payment')}
          </div>
          <div role="tabpanel" className="pt-5">{tab === 'details' ? <Details product={product} /> : <Delivery />}</div>
        </section>
      </div>

      {related.length > 0 && (
        <Rail title="Similar products" seeAllTo={product.category ? `/shop?category=${encodeURIComponent(product.category)}` : '/shop'}>
          {related.map(p => <ProductCard key={p.id} product={p} rail />)}
        </Rail>
      )}
      {seen.length > 0 && (
        <Rail title="Recently viewed">
          {seen.map(p => <ProductCard key={p.id} product={p} rail />)}
        </Rail>
      )}

      {/* Phones: the buying actions stay within thumb reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <Button className="min-w-0 flex-1 whitespace-nowrap px-3" size="lg" onClick={addToCart} disabled={out}>{out ? 'Sold out' : 'Add to cart'}</Button>
          <Button variant="secondary" size="lg" className="shrink-0 whitespace-nowrap px-5" onClick={buyNow} disabled={out}>Buy now</Button>
        </div>
      </div>
    </div>
  );
}

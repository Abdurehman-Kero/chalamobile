import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProduct } from '../api/shop';
import { errorMessage } from '../api/client';
import { categoryName, useT } from '../i18n';
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
import { EmptyState, ErrorState, PageLoader } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';
import { ProductCard } from '../components/product/ProductCard';
import { Rail } from '../components/product/Rail';
import { StockBadge } from '../components/product/StockBadge';

/** The main photo, with a column of thumbnails beside it on wide screens and a row under it on phones. */
function Gallery({ product }: { product: ProductDetail }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const images = product.images.length ? product.images : [{ id: 0, url: product.image ?? '' }];
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-line sm:rounded-3xl">
        <ProductImage
          key={current?.url} src={current?.url || null} alt={product.name} width={1000} eager
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="aspect-square w-full"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" role="tablist" aria-label={t('p.photos')}>
          {images.map((img, i) => (
            <button
              key={img.id} type="button" role="tab" aria-selected={i === index} aria-label={t('p.photo', { i: i + 1, n: images.length })}
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
  const t = useT();
  const rows: [string, string][] = [];
  if (product.brand) rows.push([t('p.brand'), product.brand]);
  if (product.category) rows.push([t('p.category'), categoryName(t, product.category)]);
  if (product.storage_gb) rows.push([t('p.storage'), `${product.storage_gb} GB`]);
  if (product.ram_gb) rows.push([t('p.ram'), `${product.ram_gb} GB`]);
  if (product.specs) rows.push([t('p.detail'), product.specs]);
  if (!rows.length) return <p className="text-muted">{t('p.noDetails')}</p>;
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
  const t = useT();
  return (
    <ul className="max-w-2xl space-y-3 text-[15px]">
      <li className="flex gap-3"><Icon name="truck" size={20} className="mt-0.5 shrink-0 text-brand-ink" /><span><b>{t('p.d1t')}</b> {t('p.d1')}</span></li>
      <li className="flex gap-3"><Icon name="wallet" size={20} className="mt-0.5 shrink-0 text-brand-ink" /><span><b>{t('p.d2t')}</b> {t('p.d2')}</span></li>
      <li className="flex gap-3"><Icon name="phone" size={20} className="mt-0.5 shrink-0 text-brand-ink" /><span><b>{t('p.d3t')}</b> {t('p.d3')} <a href={`tel:${SHOP_PHONE}`} className="font-semibold text-link underline underline-offset-2">{SHOP_PHONE_DISPLAY}</a></span></li>
    </ul>
  );
}

export default function ProductPage() {
  const t = useT();
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

  if (isPending) return <PageLoader />;
  if (isError) {
    const notFound = (error as { response?: { status?: number } }).response?.status === 404;
    return notFound
      ? <EmptyState icon="search" title={t('p.notFound')} message={t('p.notFoundText')} action={<Link className={buttonClass()} to="/shop">{t('p.browse')}</Link>} />
      : <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  const { product, related } = data;
  const out = product.stock === 'out';
  const seen = recent.filter(p => p.id !== product.id).slice(0, 8);

  const addToCart = () => {
    add(product, qty);
    show(t('toast.added', { name: product.name }), { label: t('toast.viewCart'), to: '/cart' });
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
      <Seo title={product.name} description={t('p.title', { name: product.name, price: formatBr(product.price) })} />
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <PageHeader title={product.name} fallback="/shop" />

        <div className="mt-4 grid gap-6 sm:mt-6 sm:gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,420px)] lg:items-start lg:justify-center lg:gap-12">
          <Gallery product={product} />

          <div className="space-y-3 sm:space-y-4 lg:sticky lg:top-[calc(var(--header-h,64px)+16px)]">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
              {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{product.brand}</p>}
              {product.specs && <p className="mt-0.5 text-sm text-muted">{product.specs}</p>}
              <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{formatBr(product.price)}</p>
              <div className="mt-2"><StockBadge state={product.stock} /></div>

              <div className="mt-4 sm:mt-5"><QtyStepper qty={qty} setQty={setQty} disabled={out} /></div>

              <div className="mt-5 hidden gap-3 lg:flex">
                <Button size="lg" className="flex-1" onClick={addToCart} disabled={out}>
                  <Icon name="cart" size={19} /> {out ? t('p.soldOut') : t('p.add')}
                </Button>
                <Button size="lg" variant="secondary" onClick={buyNow} disabled={out}>{t('p.buyNow')}</Button>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-on-brand sm:h-11 sm:w-11"><Icon name="store" size={21} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{SHOP_NAME}</p>
                <p className="text-xs text-muted">{t('p.shopLine')}</p>
              </div>
              <a href={`tel:${SHOP_PHONE}`} className={buttonClass('secondary', 'sm', 'shrink-0')}><Icon name="phone" size={16} /> {t('common.call')}</a>
            </div>
          </div>
        </div>

        <section className="mt-8 sm:mt-10" aria-label={t('p.more')}>
          <div role="tablist" className="flex border-b border-line">
            {tabBtn('details', t('p.details'))}
            {tabBtn('delivery', t('p.deliveryTab'))}
          </div>
          <div role="tabpanel" className="pt-5">{tab === 'details' ? <Details product={product} /> : <Delivery />}</div>
        </section>
      </div>

      {related.length > 0 && (
        <Rail title={t('p.similar')} seeAllTo={product.category ? `/shop?category=${encodeURIComponent(product.category)}` : '/shop'}>
          {related.map(p => <ProductCard key={p.id} product={p} rail />)}
        </Rail>
      )}
      {seen.length > 0 && (
        <Rail title={t('p.recent')}>
          {seen.map(p => <ProductCard key={p.id} product={p} rail />)}
        </Rail>
      )}

      {/* Phones: the buying actions stay within thumb reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <Button className="min-w-0 flex-1 whitespace-nowrap px-3" size="lg" onClick={addToCart} disabled={out}>{out ? t('p.soldOut') : t('p.add')}</Button>
          <Button variant="secondary" size="lg" className="shrink-0 whitespace-nowrap px-5" onClick={buyNow} disabled={out}>{t('p.buyNow')}</Button>
        </div>
      </div>
    </div>
  );
}

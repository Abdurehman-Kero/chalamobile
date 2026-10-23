import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHome } from '../api/shop';
import { errorMessage } from '../api/client';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';
import { formatBr, productPath } from '../lib/format';
import type { HomeData } from '../types';
import { LinkButton, buttonClass } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { ErrorState, SlowHint, useSlowHint } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { ProductExplorer } from '../components/product/ProductExplorer';
import { Rail } from '../components/product/Rail';

const pad = 'px-4 sm:px-6 lg:px-8';

function Hero({ data }: { data: HomeData }) {
  const product = data.hero;
  return (
    <section className={`mx-auto max-w-7xl ${pad} pt-1 sm:pt-3`} aria-label="Welcome">
      <div className="grid overflow-hidden rounded-3xl border border-line bg-surface md:grid-cols-2">
        <div className="flex flex-col justify-center px-6 pb-7 pt-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Phones · Laptops · Routers · Accessories</p>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
            Find your next phone, laptop or router.
          </h1>
          <p className="mt-4 max-w-md text-base text-muted sm:text-lg">
            Browse what is in stock at Chala Mobile, order online, and we confirm everything by phone.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/shop" size="lg">Shop all products</LinkButton>
            <a href={`tel:${SHOP_PHONE}`} className={buttonClass('secondary', 'lg')}>
              <Icon name="phone" size={18} /> Call {SHOP_PHONE_DISPLAY}
            </a>
          </div>
        </div>

        {product ? (
          <Link
            to={productPath(product.id)}
            className="group relative block bg-sunken px-6 pb-24 pt-6 sm:px-10 sm:pb-28 sm:pt-10 md:max-h-[560px] md:pb-24"
            aria-label={`Featured: ${product.name}, ${formatBr(product.price)}`}
          >
            <ProductImage
              src={product.image} alt="" width={900} eager
              sizes="(min-width: 768px) 45vw, 90vw"
              className="mx-auto aspect-[16/10] w-full max-w-md bg-transparent transition-transform duration-500 group-hover:scale-[1.03] md:aspect-[5/4] md:max-w-none"
            />
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 backdrop-blur sm:inset-x-6 sm:bottom-6">
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-accent">Featured</span>
                <span className="block truncate text-sm font-semibold">{product.name}</span>
              </span>
              <span className="shrink-0 text-base font-bold">{formatBr(product.price)}</span>
            </div>
          </Link>
        ) : (
          <div className="hidden bg-sunken md:block" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}

const PERKS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'truck', title: 'Delivery or pickup', text: 'Pick what suits you' },
  { icon: 'wallet', title: 'Telebirr · CBE · Cash', text: 'Pay the way you like' },
  { icon: 'wrench', title: 'Repairs in shop', text: 'Phones and laptops' },
  { icon: 'phone', title: 'Call the shop', text: SHOP_PHONE_DISPLAY },
];

function Perks() {
  return (
    <section className={`mx-auto mt-6 max-w-7xl ${pad}`} aria-label="Why shop with us">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {PERKS.map(p => (
          <li key={p.title} className="flex items-center gap-2.5 bg-surface px-3 py-3.5 sm:gap-3 sm:px-4 sm:py-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand sm:h-10 sm:w-10"><Icon name={p.icon} size={19} /></span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight sm:text-sm">{p.title}</span>
              <span className="mt-0.5 block text-xs leading-tight text-muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={`mx-auto max-w-7xl ${pad}`}><div className="skeleton h-[420px] rounded-3xl md:h-[460px]" /></div>
      <div className={`mt-10 flex gap-3 overflow-hidden ${pad}`}>
        {Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} rail />)}
      </div>
    </div>
  );
}

export default function Home() {
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ['home'], queryFn: getHome, staleTime: 60_000 });
  const slow = useSlowHint(isPending);

  return (
    <div className="pb-4">
      <Seo description="Chala Mobile: phones, laptops, routers and accessories. Order online and we confirm by phone." />
      {isPending ? (
        <>
          <HomeSkeleton />
          <SlowHint show={slow} />
        </>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <Hero data={data} />
          <Perks />

          {data.trending.length > 0 && (
            <Rail title="Trending now" subtitle="Most ordered lately" seeAllTo="/shop?tab=top">
              {data.trending.map(p => <ProductCard key={p.id} product={p} showSold rail />)}
            </Rail>
          )}
          {data.featured.length > 0 && (
            <Rail title="Featured devices" subtitle="Our premium picks" seeAllTo="/shop">
              {data.featured.map(p => <ProductCard key={p.id} product={p} rail />)}
            </Rail>
          )}
          {data.picks.length > 0 && (
            <Rail title="Items you will love" subtitle="Handpicked from across the shop">
              {data.picks.map(p => <ProductCard key={p.id} product={p} rail />)}
            </Rail>
          )}

          <ProductExplorer title="Explore everything" subtitle={`${data.total} products in the shop`} />
        </>
      )}
    </div>
  );
}

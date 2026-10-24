import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHome } from '../api/shop';
import { errorMessage } from '../api/client';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';
import { formatBr, productPath } from '../lib/format';
import type { HomeData, Product } from '../types';
import { Icon, type IconName } from '../components/ui/Icon';
import { ErrorState, SlowHint, useSlowHint } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { ProductExplorer } from '../components/product/ProductExplorer';
import { Rail } from '../components/product/Rail';

const pad = 'px-4 sm:px-6 lg:px-8';
const wrap = `mx-auto w-full max-w-7xl ${pad}`;

function Hero({ data }: { data: HomeData }) {
  const product = data.hero;
  return (
    <section className={`${wrap} pt-1 sm:pt-2`} aria-label="Welcome">
      <div className="overflow-hidden rounded-3xl bg-night text-white">
        <div className="grid items-center gap-8 px-5 py-8 sm:px-10 sm:py-12 md:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:px-14 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
              <Icon name="store" size={14} className="text-brand" /> {data.total} products in the shop
            </p>
            <h1 className="mt-4 text-[1.9rem] font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Phones, laptops and gadgets you can trust.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75 sm:text-lg">
              Browse what is in stock, order online, and we confirm everything with you by phone.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/shop" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-on-brand transition-colors hover:bg-brand-hover">
                Shop now <Icon name="chevronRight" size={18} />
              </Link>
              <a href={`tel:${SHOP_PHONE}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10">
                <Icon name="phone" size={18} /> Call to order
              </a>
            </div>
          </div>

          {product && (
            <Link
              to={productPath(product.id)}
              className="group block rounded-2xl bg-surface p-2.5 text-ink shadow-pop sm:p-3 md:ml-auto md:w-full md:max-w-sm"
              aria-label={`Featured: ${product.name}, ${formatBr(product.price)}`}
            >
              <ProductImage
                src={product.image} alt="" width={800} eager
                sizes="(min-width: 768px) 360px, 90vw"
                className="aspect-[4/3] w-full rounded-xl md:aspect-square"
                imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1.5 pt-3">
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-ink">Featured</span>
                  <span className="block truncate text-base font-semibold">{product.name}</span>
                </span>
                <span className="shrink-0 text-lg font-bold">{formatBr(product.price)}</span>
              </div>
            </Link>
          )}
        </div>
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
    <section className={`${wrap} mt-6`} aria-label="Why shop with us">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {PERKS.map(p => (
          <li key={p.title} className="flex items-start gap-2.5 bg-surface px-3.5 py-3.5 sm:items-center sm:gap-3 sm:px-4 sm:py-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink sm:h-10 sm:w-10"><Icon name={p.icon} size={19} /></span>
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

/** A swipeable row of round category icons, each with a photo from one of its products. */
function Categories({ data }: { data: HomeData }) {
  const all: Product[] = [data.hero, ...data.trending, ...data.featured, ...data.picks].filter((p): p is Product => !!p);
  const photoFor = (category: string) => all.find(p => p.category === category && p.image)?.image ?? null;
  if (data.categories.length === 0) return null;

  const item = 'group flex w-[84px] shrink-0 flex-col items-center gap-2 text-center sm:w-24';
  const label = 'line-clamp-2 text-xs font-semibold leading-tight';
  return (
    <section className={`${wrap} mt-8 sm:mt-10`} aria-label="Shop by category">
      <div className="rail overflow-x-auto pb-1">
        {/* mx-auto centres the row when it fits and lets it scroll from the left when it does not. */}
        <div className="mx-auto flex w-max gap-3 sm:gap-5">
          <Link to="/shop" className={item}>
            <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-brand-soft text-brand-ink transition-transform group-hover:-translate-y-0.5 sm:h-20 sm:w-20">
              <Icon name="grid" size={28} />
            </span>
            <span className={label}>View all</span>
          </Link>
          {data.categories.map(c => (
            <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`} className={item}>
              <ProductImage
                src={photoFor(c.name)} alt="" width={160} sizes="80px"
                className="h-[72px] w-[72px] rounded-2xl border border-line transition-transform group-hover:-translate-y-0.5 sm:h-20 sm:w-20"
              />
              <span className={label}>{c.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function RepairBand() {
  return (
    <section className={`${wrap} mt-12 sm:mt-14`} aria-label="Repairs">
      <div className="flex flex-col gap-5 rounded-3xl bg-brand-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface text-brand-ink"><Icon name="wrench" size={24} /></span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Phone or laptop broken?</h2>
            <p className="mt-1 max-w-xl text-muted">Bring it to the shop. We tell you what is wrong, what it costs and when it will be ready, before we start.</p>
          </div>
        </div>
        <Link to="/contact" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-brand px-6 text-base font-semibold text-on-brand transition-colors hover:bg-brand-hover">
          Repair details
        </Link>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={wrap}><div className="skeleton h-[460px] rounded-3xl md:h-[440px]" /></div>
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
          <Categories data={data} />

          {data.trending.length > 0 && (
            <Rail title="Trending now" subtitle="Most ordered lately" seeAllTo="/shop?tab=top">
              {data.trending.map(p => <ProductCard key={p.id} product={p} showSold rail />)}
            </Rail>
          )}
          {data.featured.length > 0 && (
            <Rail title="Featured devices" subtitle="Our premium picks" seeAllTo="/shop?tab=featured">
              {data.featured.map(p => <ProductCard key={p.id} product={p} rail />)}
            </Rail>
          )}

          <RepairBand />

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

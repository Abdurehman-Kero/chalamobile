import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHome } from '../api/shop';
import { errorMessage } from '../api/client';
import { categoryName, useT, type Key } from '../i18n';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';
import { formatBr, productPath } from '../lib/format';
import type { HomeData, Product } from '../types';
import { Icon, type IconName } from '../components/ui/Icon';
import { ErrorState, PageLoader } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';
import { ProductImage } from '../components/product/ProductImage';
import { ProductCard } from '../components/product/ProductCard';
import { ProductExplorer } from '../components/product/ProductExplorer';
import { Rail } from '../components/product/Rail';

const pad = 'px-4 sm:px-6 lg:px-8';
const wrap = `mx-auto w-full max-w-7xl ${pad}`;

/**
 * The banner. On a phone it is short, so products are one scroll away: the headline and one
 * button on the left, the featured product's photo on the right. It grows on larger screens.
 */
function Hero({ data }: { data: HomeData }) {
  const t = useT();
  const product = data.hero;
  return (
    <section className={`${wrap} pt-1 sm:pt-2`} aria-label={t('home.title')}>
      <div className="overflow-hidden rounded-2xl bg-night text-white sm:rounded-3xl">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 p-4 sm:gap-8 sm:p-10 md:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:p-14">
          <div className="min-w-0">
            <p className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 sm:inline-flex">
              <Icon name="store" size={14} className="text-brand" /> {t('home.productsInShop', { n: data.total })}
            </p>
            <h1 className="text-[1.15rem] font-bold leading-[1.2] tracking-tight sm:mt-4 sm:text-5xl sm:leading-[1.1]">
              {t('home.title')}
            </h1>
            <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-white/75 sm:mt-4 sm:line-clamp-none sm:max-w-md sm:text-lg sm:leading-relaxed">
              {t('home.sub')}
            </p>
            <div className="mt-3 flex items-center gap-2 sm:mt-7 sm:gap-3">
              <Link to="/shop" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover sm:min-h-12 sm:px-6 sm:text-base">
                {t('home.shopNow')} <Icon name="chevronRight" size={17} className="hidden min-[400px]:block" />
              </Link>
              <a href={`tel:${SHOP_PHONE}`} aria-label={t('home.callToOrder')}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/30 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:min-h-12 sm:px-6 sm:text-base">
                <Icon name="phone" size={18} /> <span className="hidden sm:inline">{t('home.callToOrder')}</span>
              </a>
            </div>
          </div>

          {product && (
            <Link
              to={productPath(product.id)}
              className="group block w-[34vw] max-w-[150px] rounded-xl bg-surface p-1.5 text-ink shadow-pop sm:w-[200px] sm:rounded-2xl sm:p-3 md:ml-auto md:w-full md:max-w-sm"
              aria-label={`${t('home.featured')}: ${product.name}, ${formatBr(product.price)}`}
            >
              <ProductImage
                src={product.image} alt="" width={800} eager
                sizes="(min-width: 768px) 360px, 150px"
                className="aspect-square w-full rounded-lg sm:rounded-xl"
                imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <p className="px-1 pb-0.5 pt-1.5 text-center text-xs font-bold sm:hidden">{formatBr(product.price)}</p>
              <div className="hidden items-center justify-between gap-3 px-2 pb-1.5 pt-3 sm:flex">
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-ink">{t('home.featured')}</span>
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

const PERKS: { icon: IconName; title: Key; text: Key }[] = [
  { icon: 'truck', title: 'perk.delivery', text: 'perk.deliveryText' },
  { icon: 'wallet', title: 'perk.pay', text: 'perk.payText' },
  { icon: 'wrench', title: 'perk.repairs', text: 'perk.repairsText' },
  { icon: 'phone', title: 'perk.call', text: 'perk.call' },
];

/** Phones: a swipeable row of small pills. Larger screens: a four-part strip. */
function Perks() {
  const t = useT();
  return (
    <section className={`${wrap} mt-3 sm:mt-6`} aria-label={t('perk.delivery')}>
      <ul className="rail flex gap-2 overflow-x-auto sm:hidden">
        {PERKS.map(p => (
          <li key={p.title} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3.5 text-[13px] font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-brand-ink"><Icon name={p.icon} size={14} /></span>
            {t(p.title)}
          </li>
        ))}
      </ul>
      <ul className="hidden grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid md:grid-cols-4">
        {PERKS.map(p => (
          <li key={p.title} className="flex items-center gap-3 bg-surface px-4 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink"><Icon name={p.icon} size={19} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{t(p.title)}</span>
              <span className="mt-0.5 block text-xs leading-tight text-muted">{p.text === 'perk.call' ? SHOP_PHONE_DISPLAY : t(p.text)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A swipeable row of round category icons, each with a photo from one of its products. */
function Categories({ data }: { data: HomeData }) {
  const t = useT();
  const all: Product[] = [data.hero, ...data.trending, ...data.featured, ...data.picks].filter((p): p is Product => !!p);
  const photoFor = (category: string) => all.find(p => p.category === category && p.image)?.image ?? null;
  if (data.categories.length === 0) return null;

  const item = 'group flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-24 sm:gap-2';
  const label = 'line-clamp-2 text-[11px] font-semibold leading-tight sm:text-xs';
  return (
    <section className={`${wrap} mt-5 sm:mt-10`} aria-label={t('home.categoriesAria')}>
      <div className="rail overflow-x-auto pb-1">
        {/* mx-auto centres the row when it fits and lets it scroll from the left when it does not. */}
        <div className="mx-auto flex w-max gap-2 sm:gap-5">
          <Link to="/shop" className={item}>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink transition-transform group-hover:-translate-y-0.5 sm:h-20 sm:w-20">
              <Icon name="grid" size={24} />
            </span>
            <span className={label}>{t('home.viewAll')}</span>
          </Link>
          {data.categories.map(c => (
            <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`} className={item}>
              <ProductImage
                src={photoFor(c.name)} alt="" width={160} sizes="80px"
                className="h-14 w-14 rounded-2xl border border-line transition-transform group-hover:-translate-y-0.5 sm:h-20 sm:w-20"
              />
              <span className={label}>{categoryName(t, c.name)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function RepairBand() {
  const t = useT();
  return (
    <section className={`${wrap} mt-9 sm:mt-14`} aria-label={t('repair.title')}>
      <div className="flex flex-col gap-4 rounded-2xl bg-brand-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:rounded-3xl sm:p-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-brand-ink sm:h-12 sm:w-12"><Icon name="wrench" size={22} /></span>
          <div>
            <h2 className="text-base font-bold tracking-tight sm:text-xl">{t('repair.title')}</h2>
            <p className="mt-1 max-w-xl text-[13px] leading-snug text-muted sm:text-base">{t('repair.text')}</p>
          </div>
        </div>
        <Link to="/contact" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-6 text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-hover sm:min-h-12 sm:text-base">
          {t('repair.button')}
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  const t = useT();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ['home'], queryFn: getHome, staleTime: 60_000 });

  return (
    <div className="pb-4">
      <Seo description={t('seo.home')} />
      {isPending ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <Hero data={data} />
          <Perks />
          <Categories data={data} />

          {data.trending.length > 0 && (
            <Rail title={t('home.trending')} subtitle={t('home.trendingSub')} seeAllTo="/shop?tab=top">
              {data.trending.map(p => <ProductCard key={p.id} product={p} showSold rail />)}
            </Rail>
          )}
          {data.featured.length > 0 && (
            <Rail title={t('home.featuredDevices')} subtitle={t('home.featuredSub')} seeAllTo="/shop?tab=featured">
              {data.featured.map(p => <ProductCard key={p.id} product={p} rail />)}
            </Rail>
          )}

          <RepairBand />

          {data.picks.length > 0 && (
            <Rail title={t('home.love')} subtitle={t('home.loveSub')}>
              {data.picks.map(p => <ProductCard key={p.id} product={p} rail />)}
            </Rail>
          )}

          <ProductExplorer title={t('home.explore')} subtitle={t('home.productsInShop', { n: data.total })} />
        </>
      )}
    </div>
  );
}

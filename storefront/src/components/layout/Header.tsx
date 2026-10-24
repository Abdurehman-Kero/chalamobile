import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategories, getNotifications, getProducts } from '../../api/shop';
import { categoryName, useT } from '../../i18n';
import { SHOP_NAME } from '../../lib/config';
import { formatBr, productPath } from '../../lib/format';
import { useAuth } from '../../store/auth';
import { cartCount, useCart } from '../../store/cart';
import { Icon } from '../ui/Icon';
import { Spinner } from '../ui/Spinner';
import { ProductImage } from '../product/ProductImage';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SHOP_NAME}`}>
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-on-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" />
        </svg>
      </span>
      {/* On phones only the mark shows, to leave room for the language, cart and Log in. */}
      <span className="hidden text-lg font-extrabold tracking-tight sm:inline">{SHOP_NAME}</span>
    </Link>
  );
}

function SearchBox() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  // The box shows the current search while on the shop page, and is empty elsewhere.
  const onShop = location.pathname === '/shop';
  const urlQuery = onShop ? params.get('q') ?? '' : '';
  const urlCategory = onShop ? params.get('category') ?? '' : '';
  const [value, setValue] = useState(urlQuery);
  const [category, setCategory] = useState(urlCategory);
  const [synced, setSynced] = useState(`${urlQuery}|${urlCategory}`);
  if (synced !== `${urlQuery}|${urlCategory}`) { setSynced(`${urlQuery}|${urlCategory}`); setValue(urlQuery); setCategory(urlCategory); }
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(timer);
  }, [value]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: 5 * 60_000 });
  const suggestions = useQuery({
    queryKey: ['suggest', debounced, category],
    queryFn: () => getProducts({ q: debounced, category: category || undefined, limit: 5 }),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);
    setOpen(false);
    navigate(qs.toString() ? `/shop?${qs}` : '/shop');
  };

  const items = suggestions.data?.products ?? [];
  const showList = open && debounced.length >= 2;

  return (
    <form ref={box} onSubmit={submit} role="search" className="relative w-full">
      <div className="flex h-11 items-center rounded-full border border-line-strong bg-sunken pl-1 pr-1 focus-within:border-ink focus-within:bg-surface">
        <label htmlFor="site-category" className="sr-only">{t('header.category')}</label>
        <select
          id="site-category" value={category} onChange={e => setCategory(e.target.value)}
          className="hidden h-9 max-w-[9.5rem] shrink-0 cursor-pointer truncate rounded-full bg-transparent pl-3 pr-1 text-sm text-muted hover:text-ink lg:block"
        >
          <option value="">{t('header.allCategories')}</option>
          {categories.data?.map(c => <option key={c.name} value={c.name}>{categoryName(t, c.name)}</option>)}
        </select>
        <span className="mx-1 hidden h-5 w-px bg-line-strong lg:block" aria-hidden="true" />
        <label htmlFor="site-search" className="sr-only">{t('header.searchProducts')}</label>
        <input
          id="site-search" type="search" value={value} autoComplete="off" enterKeyHint="search"
          onChange={e => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
          placeholder={t('header.searchPlaceholder')}
          className="h-9 min-w-0 flex-1 bg-transparent px-3 text-[15px] placeholder:text-muted/80 focus:outline-none"
        />
        <button type="submit" aria-label={t('header.search')} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-on-brand transition-colors hover:bg-brand-hover">
          <Icon name="search" size={18} />
        </button>
      </div>
      {showList && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          {suggestions.isPending ? (
            <p className="flex items-center gap-2.5 px-4 py-3 text-sm text-muted"><Spinner size={16} className="text-ink" label={t('header.searching')} /> {t('header.searching')}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{t('header.noMatches', { q: debounced })}</p>
          ) : (
            <ul>
              {items.map(p => (
                <li key={p.id}>
                  <Link to={productPath(p.id)} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-sunken">
                    <ProductImage src={p.image} alt="" width={160} className="h-11 w-11 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted">{formatBr(p.price)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-line">
                <button type="submit" className="w-full px-4 py-3 text-left text-sm font-semibold text-link hover:bg-sunken">
                  {t('header.seeAllResults', { q: debounced })}
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

function IconLink({ to, label, badge, className = '', children }: { to: string; label: string; badge?: number; className?: string; children: ReactNode }) {
  const t = useT();
  return (
    <Link to={to} aria-label={badge ? t('header.withNew', { label, n: badge }) : label}
      className={`relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-sunken ${className}`}>
      {children}
      {badge ? (
        <span className="absolute right-0 top-0 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-[18px] text-on-brand">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Signed out: a small "Sign up | Log in" pill (just Log in on the narrowest phones). Signed in: the account menu. */
function AccountArea() {
  const t = useT();
  const account = useAuth(s => s.account);
  const signOut = useAuth(s => s.signOut);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  if (!account) {
    return (
      <div className="ml-0.5 inline-flex h-9 items-center rounded-full border border-line-strong bg-surface p-0.5 text-[13px] font-bold sm:ml-1 sm:h-10 sm:text-sm">
        <Link to="/register" className="hidden h-full items-center rounded-full px-3 hover:bg-sunken min-[380px]:inline-flex">{t('header.signUp')}</Link>
        <Link to="/login" className="inline-flex h-full items-center rounded-full bg-brand px-3 text-on-brand hover:bg-brand-hover sm:px-4">{t('header.logIn')}</Link>
      </div>
    );
  }
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={t('header.accountMenu')}
        className="grid h-10 w-10 place-items-center rounded-full hover:bg-sunken">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand">{account.name.trim()[0]?.toUpperCase()}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-40 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{account.name}</p>
            <p className="truncate text-xs text-muted">{account.phone}</p>
          </div>
          <Link role="menuitem" to="/orders" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-sm hover:bg-sunken">
            <Icon name="box" size={18} /> {t('header.myOrders')}
          </Link>
          <button role="menuitem" type="button" onClick={() => { signOut(); setOpen(false); navigate('/'); }}
            className="flex min-h-11 w-full items-center gap-3 border-t border-line px-4 text-left text-sm hover:bg-sunken">
            <Icon name="logout" size={18} /> {t('header.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const count = useCart(s => cartCount(s.lines));
  const signedIn = useAuth(s => !!s.token);
  const [menu, setMenu] = useState(false);

  // Real notifications: checked every 45 seconds while signed in.
  const notices = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: signedIn,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });
  const unread = signedIn ? notices.data?.unread ?? 0 : 0;

  // The sticky tab bar on the product list sits just under the header, whatever its height.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={ref} className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-1 sm:h-16 sm:gap-3 lg:gap-8">
          <button type="button" onClick={() => setMenu(true)} aria-label={t('header.menu')} aria-haspopup="dialog"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-sunken md:hidden">
            <Icon name="menu" size={22} />
          </button>
          <Logo />
          <div className="mx-auto hidden w-full max-w-2xl md:block"><SearchBox /></div>
          <nav aria-label={t('header.accountAndCart')} className="ml-auto flex items-center gap-0 sm:gap-1">
            <LanguageSwitcher />
            {/* Phones: the bell appears once signed in. Larger screens always show it. */}
            <IconLink to={signedIn ? '/notifications' : '/login?next=/notifications'} label={t('header.notifications')} badge={unread}
              className={signedIn ? '' : 'hidden md:grid'}>
              <Icon name="bell" />
            </IconLink>
            <IconLink to="/cart" label={t('header.cartCount', { n: count })} badge={count}><Icon name="cart" /></IconLink>
            <AccountArea />
          </nav>
        </div>
        <div className="pb-2.5 md:hidden"><SearchBox /></div>
      </div>
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
    </header>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getNotifications, getProducts } from '../../api/shop';
import { SHOP_NAME } from '../../lib/config';
import { formatBr, productPath } from '../../lib/format';
import { useAuth } from '../../store/auth';
import { cartCount, useCart } from '../../store/cart';
import { Icon } from '../ui/Icon';
import { ProductImage } from '../product/ProductImage';

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SHOP_NAME}, home`}>
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight">{SHOP_NAME}</span>
    </Link>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  // The box shows the current search while on the shop page, and is empty elsewhere.
  const urlQuery = location.pathname === '/shop' ? params.get('q') ?? '' : '';
  const [value, setValue] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (syncedQuery !== urlQuery) { setSyncedQuery(urlQuery); setValue(urlQuery); }
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(t);
  }, [value]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const suggestions = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: () => getProducts({ q: debounced, limit: 5 }),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    setOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const items = suggestions.data?.products ?? [];
  const showList = open && debounced.length >= 2;

  return (
    <form ref={box} onSubmit={submit} role="search" className="relative w-full">
      <label htmlFor="site-search" className="sr-only">Search products</label>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={19} /></span>
      <input
        id="site-search" type="search" value={value} autoComplete="off" enterKeyHint="search"
        onChange={e => { setValue(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        placeholder="Search phones, laptops…"
        className="h-11 w-full rounded-xl border border-line-strong bg-canvas pl-11 pr-4 text-[15px] placeholder:text-muted focus:border-brand focus:bg-surface"
      />
      {showList && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          {suggestions.isPending ? (
            <p className="px-4 py-3 text-sm text-muted">Searching…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No matches for "{debounced}"</p>
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
                <button type="submit" className="w-full px-4 py-3 text-left text-sm font-semibold text-brand hover:bg-sunken">
                  See all results for "{debounced}"
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

function IconLink({ to, label, badge, children }: { to: string; label: string; badge?: number; children: React.ReactNode }) {
  return (
    <Link to={to} aria-label={badge ? `${label}, ${badge} new` : label}
      className="relative grid h-11 w-11 place-items-center rounded-xl text-ink transition-colors hover:bg-sunken">
      {children}
      {badge ? (
        <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-[18px] text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

function AccountMenu() {
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
      <Link to="/login" aria-label="Sign in" className="grid h-11 min-w-11 place-items-center rounded-xl px-0 text-ink hover:bg-sunken sm:px-3">
        <span className="flex items-center gap-2"><Icon name="user" /><span className="hidden text-sm font-semibold sm:inline">Sign in</span></span>
      </Link>
    );
  }
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu"
        className="grid h-11 w-11 place-items-center rounded-xl hover:bg-sunken">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">{account.name.trim()[0]?.toUpperCase()}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-40 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{account.name}</p>
            <p className="truncate text-xs text-muted">{account.phone}</p>
          </div>
          <Link role="menuitem" to="/orders" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 px-4 text-sm hover:bg-sunken">
            <Icon name="box" size={18} /> My orders
          </Link>
          <button role="menuitem" type="button" onClick={() => { signOut(); setOpen(false); navigate('/'); }}
            className="flex min-h-11 w-full items-center gap-3 border-t border-line px-4 text-left text-sm hover:bg-sunken">
            <Icon name="logout" size={18} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const ref = useRef<HTMLElement>(null);
  const count = useCart(s => cartCount(s.lines));
  const signedIn = useAuth(s => !!s.token);

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
    <header ref={ref} className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3 lg:gap-6">
          <Logo />
          <div className="mx-auto hidden w-full max-w-xl md:block"><SearchBox /></div>
          <nav aria-label="Account and cart" className="ml-auto flex items-center gap-0.5">
            <IconLink to={signedIn ? '/notifications' : '/login?next=/notifications'} label="Notifications" badge={unread}><Icon name="bell" /></IconLink>
            <IconLink to="/cart" label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`} badge={count}><Icon name="cart" /></IconLink>
            <AccountMenu />
          </nav>
        </div>
        <div className="pb-3 md:hidden"><SearchBox /></div>
      </div>
    </header>
  );
}

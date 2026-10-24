import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LANGS, useLang, useT } from '../../i18n';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../../lib/config';
import { useAuth } from '../../store/auth';
import { buttonClass } from '../ui/Button';
import { Logo } from './Logo';
import { Icon, type IconName } from '../ui/Icon';

/** The phone menu: every main link in one slide-in panel, so the top of the page stays small. */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const account = useAuth(s => s.account);
  const signOut = useAuth(s => s.signOut);
  const lang = useLang(s => s.lang);
  const setLang = useLang(s => s.setLang);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = previous; };
  }, [open, onClose]);

  if (!open) return null;

  const links: { to: string; icon: IconName; label: string }[] = [
    { to: '/', icon: 'store', label: t('header.home') },
    { to: '/shop?tab=new', icon: 'sparkle', label: t('sub.new') },
    { to: '/shop?tab=top', icon: 'flame', label: t('sub.popular') },
    { to: '/shop?tab=featured', icon: 'star', label: t('sub.featured') },
    { to: '/contact', icon: 'wrench', label: t('sub.repairs') },
    { to: '/orders', icon: 'box', label: t('header.myOrders') },
    { to: '/notifications', icon: 'bell', label: t('header.notifications') },
    { to: '/cart', icon: 'cart', label: t('header.cart') },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t('header.menu')}>
      <button type="button" aria-label={t('header.closeMenu')} onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <Logo onClick={onClose} />
          <button ref={closeBtn} type="button" onClick={onClose} aria-label={t('header.closeMenu')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-sunken">
            <Icon name="x" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label={t('sub.aria')}>
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={onClose} className="flex min-h-12 items-center gap-3.5 rounded-xl px-3 text-[15px] font-semibold hover:bg-sunken">
              <Icon name={l.icon} size={20} className="text-brand-ink" /> {l.label}
            </Link>
          ))}

          <div className="mx-2 mt-3 border-t border-line pt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted"><Icon name="globe" size={15} /> {t('header.language')}</p>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map(l => (
                <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => setLang(l.code)}
                  className={`min-h-11 rounded-xl border px-1 text-[13px] font-semibold ${lang === l.code ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line-strong hover:bg-sunken'}`}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="space-y-3 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {account ? (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand font-bold text-on-brand">{account.name.trim()[0]?.toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{account.name}</span>
                <span className="block truncate text-xs text-muted">{account.phone}</span>
              </span>
              <button type="button" onClick={() => { signOut(); onClose(); navigate('/'); }} className={buttonClass('secondary', 'sm')}>{t('header.signOut')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link to="/register" onClick={onClose} className={buttonClass('secondary', 'md')}>{t('header.signUp')}</Link>
              <Link to="/login" onClick={onClose} className={buttonClass('primary', 'md')}>{t('header.logIn')}</Link>
            </div>
          )}
          <a href={`tel:${SHOP_PHONE}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sunken text-sm font-semibold">
            <Icon name="phone" size={17} /> {t('header.callUs')} · {SHOP_PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </div>
  );
}

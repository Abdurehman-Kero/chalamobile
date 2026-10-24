import { Link, useLocation } from 'react-router-dom';
import { useT, type Key } from '../../i18n';
import { Icon, type IconName } from '../ui/Icon';

const LINKS: { to: string; label: Key; icon: IconName }[] = [
  { to: '/shop?tab=new', label: 'sub.new', icon: 'sparkle' },
  { to: '/shop?tab=top', label: 'sub.popular', icon: 'flame' },
  { to: '/shop?tab=featured', label: 'sub.featured', icon: 'star' },
  { to: '/contact', label: 'sub.repairs', icon: 'wrench' },
];

/**
 * A rounded row of the main ways into the catalogue, under the header, for tablets and computers.
 * On phones the same links live in the menu (the hamburger button), so the top of the page stays small.
 */
export function SubNav() {
  const t = useT();
  const { pathname, search } = useLocation();
  const here = pathname + search;
  return (
    <nav aria-label={t('sub.aria')} className="mx-auto hidden w-full max-w-7xl min-w-0 px-6 pt-4 md:block lg:px-8">
      <div className="rail flex justify-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5">
        {LINKS.map(l => {
          const active = here === l.to;
          return (
            <Link
              key={l.to} to={l.to} aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                active ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-sunken'
              }`}
            >
              <Icon name={l.icon} size={17} className={active ? '' : 'text-muted'} /> {t(l.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';

const LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/shop?tab=new', label: 'New arrivals', icon: 'sparkle' },
  { to: '/shop?tab=top', label: 'Popular products', icon: 'flame' },
  { to: '/shop?tab=featured', label: 'Featured', icon: 'star' },
  { to: '/contact', label: 'Repairs', icon: 'wrench' },
];

/** A rounded row of the main ways into the catalogue, under the header. Swipes sideways on phones. */
export function SubNav() {
  const { pathname, search } = useLocation();
  const here = pathname + search;
  return (
    <nav aria-label="Main" className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="rail flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 sm:justify-center">
        {LINKS.map(l => {
          const active = here === l.to;
          return (
            <Link
              key={l.to} to={l.to} aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
                active ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-sunken'
              }`}
            >
              <Icon name={l.icon} size={17} className={active ? '' : 'text-muted'} /> {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';

interface Props {
  title: string;
  subtitle?: string;
  seeAllTo?: string;
  children: ReactNode;
}

/**
 * A titled row of cards that swipes sideways. Cards snap into place and the next one
 * peeks in, so it is obvious there is more. On wide screens, arrow buttons scroll it.
 */
export function Rail({ title, subtitle, seeAllTo, children }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="mx-auto mt-10 w-full max-w-7xl sm:mt-12" aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {seeAllTo && (
            <Link to={seeAllTo} className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-link hover:bg-sunken">
              See all
            </Link>
          )}
          <div className="hidden gap-1.5 md:flex">
            <button type="button" onClick={() => scrollBy(-1)} aria-label={`Scroll ${title} left`}
              className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface hover:bg-sunken">
              <Icon name="chevronLeft" />
            </button>
            <button type="button" onClick={() => scrollBy(1)} aria-label={`Scroll ${title} right`}
              className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface hover:bg-sunken">
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scroller}
        className="rail flex snap-x snap-proximity gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 sm:gap-4 sm:scroll-px-6 sm:px-6 lg:scroll-px-8 lg:px-8"
        tabIndex={0}
      >
        {children}
      </div>
    </section>
  );
}

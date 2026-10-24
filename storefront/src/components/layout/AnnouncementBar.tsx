import { Link } from 'react-router-dom';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../../lib/config';
import { Icon } from '../ui/Icon';

/** A thin utility line above the header: how ordering works on the left, quick links on the right. */
export function AnnouncementBar() {
  return (
    <div className="border-b border-line bg-surface text-xs text-muted">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-6 px-4 py-2 sm:justify-between sm:px-6 lg:px-8">
        <p className="hidden sm:block">Order online · pay with Telebirr, CBE or cash</p>
        <div className="flex items-center gap-x-5">
          <Link to="/contact" className="hidden hover:text-ink sm:inline">Repairs</Link>
          <Link to="/contact" className="hidden hover:text-ink sm:inline">Contact</Link>
          <a href={`tel:${SHOP_PHONE}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:text-brand-ink">
            <Icon name="phone" size={14} /> {SHOP_PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { SHOP_NAME, SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../../lib/config';
import { Icon } from '../ui/Icon';

export function Footer() {
  const link = 'inline-flex min-h-9 items-center gap-2.5 text-sm text-white/75 transition-colors hover:text-white';
  const heading = 'mb-3 text-lg font-bold text-brand';
  return (
    <footer className="mt-16 bg-night text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label={`${SHOP_NAME}, home`}>
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-on-brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" />
              </svg>
            </span>
            <span className="text-xl font-extrabold tracking-tight">{SHOP_NAME}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
            Phones, laptops, routers and accessories, plus phone repairs. Order online and we confirm by phone.
          </p>
          <a href={`tel:${SHOP_PHONE}`} className={`${link} mt-3 font-semibold text-white`}>
            <Icon name="phone" size={18} className="text-brand" /> {SHOP_PHONE_DISPLAY}
          </a>
        </div>

        <div>
          <p className={heading}>Explore</p>
          <ul>
            <li><Link className={link} to="/shop"><Icon name="grid" size={17} className="text-brand" /> All products</Link></li>
            <li><Link className={link} to="/shop?tab=top"><Icon name="flame" size={17} className="text-brand" /> Popular products</Link></li>
            <li><Link className={link} to="/shop?tab=new"><Icon name="sparkle" size={17} className="text-brand" /> New arrivals</Link></li>
            <li><Link className={link} to="/contact"><Icon name="wrench" size={17} className="text-brand" /> Repairs and contact</Link></li>
          </ul>
        </div>

        <div>
          <p className={heading}>Your account</p>
          <ul>
            <li><Link className={link} to="/orders"><Icon name="box" size={17} className="text-brand" /> My orders</Link></li>
            <li><Link className={link} to="/notifications"><Icon name="bell" size={17} className="text-brand" /> Notifications</Link></li>
            <li><Link className={link} to="/cart"><Icon name="cart" size={17} className="text-brand" /> Cart</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/55 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {SHOP_NAME}. All rights reserved. Prices are in Ethiopian Birr (Br).
        </p>
      </div>
    </footer>
  );
}

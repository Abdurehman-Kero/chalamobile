import { Link } from 'react-router-dom';
import { SHOP_NAME, SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../../lib/config';
import { Icon } from '../ui/Icon';

export function Footer() {
  const link = 'inline-flex min-h-9 items-center text-sm text-muted hover:text-ink';
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-lg font-bold">{SHOP_NAME}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Phones, laptops, routers and accessories, plus phone repairs. Order online and we confirm by phone.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Shop</p>
          <ul>
            <li><Link className={link} to="/shop">All products</Link></li>
            <li><Link className={link} to="/shop?category=Smartphones">Smartphones</Link></li>
            <li><Link className={link} to="/shop?category=Laptops">Laptops</Link></li>
            <li><Link className={link} to="/shop?category=Accessories">Accessories</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Your account</p>
          <ul>
            <li><Link className={link} to="/orders">My orders</Link></li>
            <li><Link className={link} to="/notifications">Notifications</Link></li>
            <li><Link className={link} to="/cart">Cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Contact us</p>
          <a href={`tel:${SHOP_PHONE}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand">
            <Icon name="phone" size={18} /> {SHOP_PHONE_DISPLAY}
          </a>
          <p className="mt-1 text-sm text-muted">Call for orders, questions or repairs.</p>
          <Link className={`${link} mt-1 font-semibold text-brand`} to="/contact">Repairs and contact</Link>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {SHOP_NAME}. Prices are in Ethiopian Birr (Br).
        </p>
      </div>
    </footer>
  );
}

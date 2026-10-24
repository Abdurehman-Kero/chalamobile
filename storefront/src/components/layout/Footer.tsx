import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { SHOP_NAME, SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../../lib/config';
import { Icon } from '../ui/Icon';

export function Footer() {
  const t = useT();
  const link = 'inline-flex min-h-9 items-center gap-2.5 text-sm text-white/75 transition-colors hover:text-white';
  const heading = 'mb-2 text-base font-bold text-brand sm:mb-3 sm:text-lg';
  return (
    <footer className="mt-12 bg-night text-white sm:mt-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:grid-cols-2 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-3 lg:px-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label={SHOP_NAME}>
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-on-brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" />
              </svg>
            </span>
            <span className="text-xl font-extrabold tracking-tight">{SHOP_NAME}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{t('ft.blurb')}</p>
          <a href={`tel:${SHOP_PHONE}`} className={`${link} mt-3 font-semibold text-white`}>
            <Icon name="phone" size={18} className="text-brand" /> {SHOP_PHONE_DISPLAY}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:contents">
          <div>
            <p className={heading}>{t('ft.explore')}</p>
            <ul>
              <li><Link className={link} to="/shop"><Icon name="grid" size={17} className="text-brand" /> {t('ft.all')}</Link></li>
              <li><Link className={link} to="/shop?tab=top"><Icon name="flame" size={17} className="text-brand" /> {t('ft.popular')}</Link></li>
              <li><Link className={link} to="/shop?tab=new"><Icon name="sparkle" size={17} className="text-brand" /> {t('ft.new')}</Link></li>
              <li><Link className={link} to="/contact"><Icon name="wrench" size={17} className="text-brand" /> {t('ft.repairs')}</Link></li>
            </ul>
          </div>

          <div>
            <p className={heading}>{t('ft.account')}</p>
            <ul>
              <li><Link className={link} to="/orders"><Icon name="box" size={17} className="text-brand" /> {t('ft.orders')}</Link></li>
              <li><Link className={link} to="/notifications"><Icon name="bell" size={17} className="text-brand" /> {t('ft.notifications')}</Link></li>
              <li><Link className={link} to="/cart"><Icon name="cart" size={17} className="text-brand" /> {t('ft.cart')}</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/55 sm:px-6 lg:px-8">
          {t('ft.rights', { year: new Date().getFullYear(), name: SHOP_NAME })}
        </p>
      </div>
    </footer>
  );
}

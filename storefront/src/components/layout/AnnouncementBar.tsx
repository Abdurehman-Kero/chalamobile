import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../../lib/config';
import { Icon } from '../ui/Icon';

/** A slim line above the header with the ways to pay and the shop's number. */
export function AnnouncementBar() {
  return (
    <div className="bg-ink text-[13px] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-6 px-4 py-2 sm:justify-between sm:px-6 lg:px-8">
        <p className="hidden sm:block">Order online · pay with Telebirr, CBE or cash</p>
        <a href={`tel:${SHOP_PHONE}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
          <Icon name="phone" size={15} /> Questions? Call {SHOP_PHONE_DISPLAY}
        </a>
      </div>
    </div>
  );
}

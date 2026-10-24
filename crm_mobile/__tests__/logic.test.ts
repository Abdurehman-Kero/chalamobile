jest.mock('@react-native-async-storage/async-storage', () => {
  const mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => mem[k] ?? null,
      setItem: async (k: string, v: string) => { mem[k] = v; },
    },
  };
});

import { useLang, translate } from '../src/i18n';
import { useCartStore } from '../src/store/cartStore';
import { formatBr, formatBrCompact } from '../src/utils/formatCurrency';
import { getErrorMessage } from '../src/api/errors';

const phone = { product_id: 1, name: 'Samsung A15', spec: '128+4GB', price: 15000, emoji: '📱', stock: 2 };

describe('cart', () => {
  beforeEach(() => useCartStore.getState().clearCart());

  it('adds an item and totals it', () => {
    expect(useCartStore.getState().addItem(phone)).toBe(true);
    expect(useCartStore.getState().total()).toBe(15000);
  });

  it('never lets the quantity exceed the stock on hand', () => {
    const cart = useCartStore.getState();
    expect(cart.addItem(phone)).toBe(true);   // 1
    expect(cart.addItem(phone)).toBe(true);   // 2 (= stock)
    expect(cart.addItem(phone)).toBe(false);  // capped
    expect(useCartStore.getState().items[0].qty).toBe(2);
    expect(useCartStore.getState().count()).toBe(2);
  });

  it('refuses out-of-stock products', () => {
    expect(useCartStore.getState().addItem({ ...phone, stock: 0 })).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes a line when its quantity drops to zero', () => {
    useCartStore.getState().addItem(phone);
    useCartStore.getState().decrementQty(1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('clearing the cart also clears the linked customer', () => {
    useCartStore.getState().setCustomer({ id: 5, name: 'Ahmed' });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().customer).toBeNull();
  });
});

describe('currency', () => {
  it('formats prices with thousands separators', () => {
    expect(formatBr(15000)).toBe('15,000 Br');
    expect(formatBr('7000.00')).toBe('7,000 Br');
    expect(formatBr(null)).toBe('0 Br');
  });

  it('compacts large dashboard numbers', () => {
    expect(formatBrCompact(850)).toBe('850 Br');
    expect(formatBrCompact(179450)).toBe('179k Br');
    expect(formatBrCompact(2500000)).toBe('2.5M Br');
  });
});

describe('error messages', () => {
  it('explains an unreachable server', () => {
    expect(getErrorMessage({ message: 'Network Error' })).toMatch(/Can't connect right now/);
  });

  it('prefers the message sent by the server', () => {
    const err = { response: { status: 400, data: { error: 'Only 1 left in stock for Phone' } } };
    expect(getErrorMessage(err)).toBe('Only 1 left in stock for Phone');
  });

  it('explains a timeout', () => {
    expect(getErrorMessage({ code: 'ECONNABORTED' })).toMatch(/longer than expected/);
  });
});

import { addDaysYmd, formatDay, formatDayRelative, todayYmd, toYmd } from '../src/utils/formatDate';

describe('calendar days', () => {
  it('adds days across a month and year boundary', () => {
    expect(addDaysYmd('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysYmd('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('formats a day the way people say it', () => {
    expect(formatDay('2026-10-22')).toBe('Thu 22 Oct');
    expect(formatDay(null)).toBe('—');
  });

  it('says Today / Tomorrow / Yesterday for the nearby days', () => {
    const t = todayYmd();
    expect(formatDayRelative(t)).toBe('Today');
    expect(formatDayRelative(addDaysYmd(t, 1))).toBe('Tomorrow');
    expect(formatDayRelative(addDaysYmd(t, -1))).toBe('Yesterday');
    expect(formatDayRelative(addDaysYmd(t, 5))).toBe(formatDay(addDaysYmd(t, 5)));
  });

  it('todayYmd matches the local calendar day', () => {
    expect(todayYmd()).toBe(toYmd(new Date()));
  });
});

describe('languages', () => {
  afterEach(() => useLang.getState().setLang('en'));

  it('shows English text as written and fills in the {parts}', () => {
    expect(translate('en', 'Save changes')).toBe('Save changes');
    expect(translate('en', '{n} products', { n: 3 })).toBe('3 products');
  });

  it('translates into Afaan Oromoo and Amharic, keeping the {parts}', () => {
    expect(translate('om', 'Sign in')).toBe('Seeni');
    expect(translate('am', '{n} products', { n: 3 })).toBe('3 ምርቶች');
  });

  it('falls back to English for a text that has no translation yet', () => {
    expect(translate('om', 'A line nobody has translated')).toBe('A line nobody has translated');
  });

  it('writes day names and relative days in the chosen language', () => {
    useLang.getState().setLang('om');
    expect(formatDayRelative(todayYmd())).toBe("Har'a");
    useLang.getState().setLang('am');
    expect(formatDayRelative(todayYmd())).toBe('ዛሬ');
  });
});

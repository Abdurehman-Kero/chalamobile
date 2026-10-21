import { create } from 'zustand';

export interface CartItem {
  product_id: number;
  name: string;
  spec: string;
  price: number;
  qty: number;
  emoji: string;
  stock: number;
}

interface CartState {
  items: CartItem[];
  customer: { id: number; name: string } | null;
  addItem: (item: Omit<CartItem, 'qty'>) => boolean;
  incrementQty: (product_id: number) => boolean;
  decrementQty: (product_id: number) => void;
  removeItem: (product_id: number) => void;
  setCustomer: (c: { id: number; name: string } | null) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
}

// Quantities are capped at the stock on hand. add/increment return false when
// the cap is hit so the screen can tell the user why nothing changed.
export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,

  addItem: (item) => {
    const existing = get().items.find(i => i.product_id === item.product_id);
    if (existing) return get().incrementQty(item.product_id);
    if (item.stock < 1) return false;
    set({ items: [...get().items, { ...item, qty: 1 }] });
    return true;
  },

  incrementQty: (product_id) => {
    const line = get().items.find(i => i.product_id === product_id);
    if (!line || line.qty >= line.stock) return false;
    set({ items: get().items.map(i => i.product_id === product_id ? { ...i, qty: i.qty + 1 } : i) });
    return true;
  },

  decrementQty: (product_id) =>
    set({
      items: get().items
        .map(i => i.product_id === product_id ? { ...i, qty: i.qty - 1 } : i)
        .filter(i => i.qty > 0),
    }),

  removeItem: (product_id) => set({ items: get().items.filter(i => i.product_id !== product_id) }),
  setCustomer: (customer) => set({ customer }),
  clearCart: () => set({ items: [], customer: null }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';

// The server accepts at most this many of one item per order.
export const MAX_QTY = 10;

export interface CartLine {
  id: number;
  name: string;
  brand: string | null;
  specs: string | null;
  price: number;
  image: string | null;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: Product, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (p, qty = 1) => set((s) => {
        const existing = s.lines.find(l => l.id === p.id);
        if (existing) {
          return { lines: s.lines.map(l => (l.id === p.id ? { ...l, price: p.price, qty: Math.min(MAX_QTY, l.qty + qty) } : l)) };
        }
        return {
          lines: [...s.lines, {
            id: p.id, name: p.name, brand: p.brand, specs: p.specs, price: p.price, image: p.image, qty: Math.min(MAX_QTY, qty),
          }],
        };
      }),
      setQty: (id, qty) => set((s) => ({
        lines: s.lines.map(l => (l.id === id ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)),
      })),
      remove: (id) => set((s) => ({ lines: s.lines.filter(l => l.id !== id) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'chala-cart' },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.price, 0);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';

const MAX = 8;

interface RecentState {
  items: Product[];
  /** Remembers a product the person looked at, newest first. */
  view: (product: Product) => void;
}

export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      items: [],
      view: (product) => set((s) => ({ items: [product, ...s.items.filter(p => p.id !== product.id)].slice(0, MAX) })),
    }),
    { name: 'chala-recent' },
  ),
);

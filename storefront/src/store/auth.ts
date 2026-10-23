import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '../types';

interface AuthState {
  token: string | null;
  account: Account | null;
  signIn: (token: string, account: Account) => void;
  signOut: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      account: null,
      signIn: (token, account) => set({ token, account }),
      signOut: () => set({ token: null, account: null }),
    }),
    { name: 'chala-auth' },
  ),
);

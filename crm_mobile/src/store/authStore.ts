import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/axios';

interface AuthState {
  user: authApi.User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const clearCachedData = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const owned = keys.filter(k => k.startsWith('cache:'));
  if (owned.length) await AsyncStorage.removeMany(owned);
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { token, user } = await authApi.login(email, password);
    await AsyncStorage.setMany({ auth_token: token, user_profile: JSON.stringify(user) });
    set({ token, user, isAuthenticated: true });
  },

  // Also wipes cached business data so the next person to sign in on this
  // device never sees the previous session's numbers.
  logout: async () => {
    await AsyncStorage.removeMany(['auth_token', 'user_profile']);
    await clearCachedData().catch(() => {});
    set({ token: null, user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_profile'),
      ]);
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

// An expired or revoked token returns the user to the sign-in screen.
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().isAuthenticated) useAuthStore.getState().logout();
});

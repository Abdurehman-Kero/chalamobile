import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/axios';
import { useLang } from '../i18n';
import { cancelAll } from '../reminders/notifications';

interface AuthState {
  user: authApi.User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Saves the profile the server returned after the person changed their own details. */
  saveProfile: (change: authApi.ProfileChange) => Promise<void>;
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

  saveProfile: async (change) => {
    const { token, user } = await authApi.updateProfile(change);
    await AsyncStorage.setMany({ auth_token: token, user_profile: JSON.stringify(user) });
    set({ token, user });
  },

  // Also wipes cached business data so the next person to sign in on this
  // device never sees the previous session's numbers.
  logout: async () => {
    await AsyncStorage.removeMany(['auth_token', 'user_profile']);
    await clearCachedData().catch(() => {});
    // The next person to sign in on this phone must not hear this person's alarms.
    await cancelAll();
    set({ token: null, user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_profile'),
        useLang.getState().restoreLang(),
      ]);
      if (token && userStr) {
        // Opens straight away from the saved copy, so the app works offline.
        set({ token, user: JSON.parse(userStr), isAuthenticated: true, isLoading: false });
        // Then quietly picks up a changed name, email or role. No answer (offline) keeps the saved copy.
        authApi.getProfile().then(async (user) => {
          if (useAuthStore.getState().token !== token) return;
          await AsyncStorage.setItem('user_profile', JSON.stringify(user));
          set({ user });
        }).catch(() => {});
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

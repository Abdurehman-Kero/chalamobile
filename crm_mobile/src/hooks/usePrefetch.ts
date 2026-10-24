import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as productsApi from '../api/products';
import * as customersApi from '../api/customers';
import * as repairsApi from '../api/repairs';
import * as usersApi from '../api/users';
import { pingServer } from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { useConnectivityStore } from '../store/connectivityStore';

const KEEP_AWAKE_EVERY_MS = 4 * 60 * 1000;

const save = (key: string, load: () => Promise<unknown>) =>
  load().then(data => AsyncStorage.setItem(`cache:${key}`, JSON.stringify(data))).catch(() => {});

/**
 * Makes the app feel quick:
 *  - right after sign-in, loads the other tabs' lists in the background and saves them, so opening
 *    Stock, Clients or Repairs shows its list at once instead of a spinner;
 *  - while the app is open, visits the server every few minutes so a free host never falls asleep
 *    under the person who is using it.
 */
export function usePrefetch() {
  const role = useAuthStore(s => s.user?.role);
  const userId = useAuthStore(s => s.user?.id);
  const online = useConnectivityStore(s => s.isOnline);

  useEffect(() => {
    if (!role || userId == null || !online) return;
    const jobs: Promise<unknown>[] = [];
    if (role !== 'technician') {
      jobs.push(save('products', productsApi.getProducts), save('customers', customersApi.getCustomers));
    }
    if (role !== 'sales') jobs.push(save('repairs', repairsApi.getRepairs));
    if (role === 'owner') jobs.push(save('technicians', usersApi.getTechnicians));
    Promise.all(jobs);
  }, [role, userId, online]);

  useEffect(() => {
    if (userId == null) return;
    const timer = setInterval(() => { if (AppState.currentState === 'active') pingServer(); }, KEEP_AWAKE_EVERY_MS);
    return () => clearInterval(timer);
  }, [userId]);
}

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as repairsApi from '../api/repairs';
import { Repair } from '../api/repairs';
import { useAuthStore } from '../store/authStore';
import { useLang } from '../i18n';
import { useConnectivityStore } from '../store/connectivityStore';
import { EventType } from '@notifee/react-native';
import { askPermission, notifee, remindersSupported, syncReminders } from './notifications';

/** Puts these repairs' alarms on the phone. Safe to call as often as the data changes. */
export function applyReminders(repairs: Repair[] | null | undefined) {
  const user = useAuthStore.getState().user;
  if (!user || !repairs) return;
  syncReminders(repairs, user.role, user.id);
}

/**
 * Keeps the alarms right while signed in. Mount once, inside the navigator.
 *  - asks once for permission to show notifications,
 *  - plans the alarms from the saved repairs straight away (so it works offline),
 *  - plans again from the server's list when the app opens, comes back, or the connection returns,
 *  - opens the Repairs page when an alarm is tapped.
 */
export function useRepairReminders() {
  const navigation: any = useNavigation();
  const userId = useAuthStore(s => s.user?.id);
  const role = useAuthStore(s => s.user?.role);
  const reconnectTick = useConnectivityStore(s => s.reconnectTick);
  const online = useConnectivityStore(s => s.isOnline);
  // The alarm speaks the chosen language, so choosing another plans the alarms again.
  const lang = useLang(s => s.lang);
  const asked = useRef(false);

  useEffect(() => {
    if (!remindersSupported || userId == null || role === 'sales') return;
    let cancelled = false;

    const fromServer = async () => {
      try { applyReminders(await repairsApi.getRepairs()); } catch { /* keep the alarms as they are */ }
    };

    (async () => {
      if (!asked.current) { asked.current = true; await askPermission(); }
      // First the copy saved on the phone, so alarms exist even with no connection.
      try {
        const raw = await AsyncStorage.getItem('cache:repairs');
        if (!cancelled && raw) applyReminders(JSON.parse(raw));
      } catch { /* none saved yet */ }
      if (!cancelled && online) fromServer();
    })();

    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') fromServer(); });
    return () => { cancelled = true; sub.remove(); };
  }, [userId, role, reconnectTick, online, lang]);

  useEffect(() => {
    if (!remindersSupported) return;
    return notifee.onForegroundEvent(({ type }) => {
      if (type === EventType.PRESS) navigation.navigate('Main', { screen: 'Repair' });
    });
  }, [navigation]);
}

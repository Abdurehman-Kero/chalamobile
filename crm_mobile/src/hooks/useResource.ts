import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getErrorMessage, isNetworkError } from '../api/errors';
import { useConnectivityStore } from '../store/connectivityStore';
import { useAuthStore } from '../store/authStore';
import { useOutboxStore } from '../offline/outboxStore';
import { Op } from '../offline/types';
import { syncIfWaiting } from '../offline/engine';

// Puts the changes still waiting to sync on top of the server's data.
type Overlay<T> = (data: T, pendingOps: Op[]) => T;

/**
 * Loads server data for a screen.
 *  - shows the last saved copy immediately (works offline),
 *  - refreshes from the server whenever the screen is focused or the
 *    connection comes back, so a sale made on one tab shows up on the others,
 *  - shows the person's own unsynced changes on top (the optional `overlay`),
 *  - refetches when queued changes reach the server,
 *  - ignores out-of-order responses,
 *  - reports failures as `error` instead of swallowing them. If a saved copy
 *    exists it stays on screen and `error` just explains that it may be old.
 */
export function useResource<T>(key: string, fetcher: () => Promise<T>, overlay?: Overlay<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // True during any request, including the quiet refresh when a tab is opened.
  const [fetching, setFetching] = useState(false);

  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const hasData = useRef(false);
  const cacheKey = `cache:${key}`;

  // Show the saved copy straight away while the first request is in flight.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(cacheKey)
      .then((raw) => {
        if (cancelled || !raw || hasData.current) return;
        hasData.current = true;
        setData(JSON.parse(raw));
        setLoading(false);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [cacheKey]);

  const load = useCallback(async (pullToRefresh = false) => {
    const id = ++requestId.current;
    if (pullToRefresh) setRefreshing(true);
    setFetching(true);
    try {
      const result = await fetcherRef.current();
      if (id !== requestId.current) return;
      hasData.current = true;
      setData(result);
      setError(null);
      // The server just answered, so this is a good moment to send anything saved offline.
      syncIfWaiting();
      AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    } catch (e) {
      if (id !== requestId.current) return;
      // Not being able to reach the server while data is on screen is already
      // explained by the banner at the top, so there is no second message here.
      if (isNetworkError(e) && hasData.current) return;
      setError(getErrorMessage(e));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        setFetching(false);
      }
    }
  }, [cacheKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const reconnectTick = useConnectivityStore(s => s.reconnectTick);
  useEffect(() => { if (reconnectTick > 0) load(); }, [reconnectTick, load]);

  // Changes that reached the server: fetch what the server now says.
  const syncTick = useOutboxStore(s => s.syncTick);
  useEffect(() => { if (syncTick > 0) load(); }, [syncTick, load]);

  const refresh = useCallback(() => load(true), [load]);
  const reload = useCallback(() => load(false), [load]);

  // The saved copy plus this person's changes that have not reached the server yet.
  const allOps = useOutboxStore(s => s.ops);
  const userId = useAuthStore(s => s.user?.id);
  const view = useMemo(() => {
    if (!data || !overlay) return data;
    const pending = allOps.filter(o => o.userId === userId && o.status === 'pending');
    return pending.length ? overlay(data, pending) : data;
  }, [data, overlay, allOps, userId]);

  return { data: view, error, loading, refreshing, fetching, refresh, reload };
}

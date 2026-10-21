import { useEffect, useMemo } from 'react';
import { useResource } from './useResource';
import { useAlertStore } from '../store/alertStore';
import * as alertsApi from '../api/alerts';
import { Alert } from '../api/alerts';

// Alerts from the server, minus the ones the user ignored today.
export function useAlerts() {
  const res = useResource('alerts', alertsApi.getAlerts);
  const { ignored, seen, loaded, load, markSeen, ignore } = useAlertStore();

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const all = useMemo<Alert[]>(() => res.data ?? [], [res.data]);
  const visible = useMemo(() => all.filter(a => !ignored[a.key]), [all, ignored]);
  // Not yet shown in today's pop-up.
  const unseen = useMemo(() => visible.filter(a => !seen[a.key]), [visible, seen]);

  return { ...res, all, visible, unseen, loaded, markSeen, ignore };
}

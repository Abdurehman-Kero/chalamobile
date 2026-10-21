import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { pingServer, setReachabilityHandler } from '../api/axios';

// "Online" here means: the phone has a network AND the server answers. The
// phone's own "internet reachable" flag is ignored on purpose. A shop Wi-Fi
// with no internet can still reach the server, and that is all the app needs.
interface ConnectivityState {
  deviceConnected: boolean;   // the phone is on some network (Wi-Fi, mobile data...)
  serverUp: boolean;          // the last request to the server got an answer
  isOnline: boolean;          // deviceConnected && serverUp
  // Bumped every time the app goes from offline to online. Screens and the sync engine watch it.
  reconnectTick: number;
  startMonitoring: () => () => void;
}

const PROBE_EVERY_MS = 4000;
let probeTimer: ReturnType<typeof setInterval> | null = null;

export const useConnectivityStore = create<ConnectivityState>((set, get) => {
  const apply = (patch: Partial<Pick<ConnectivityState, 'deviceConnected' | 'serverUp'>>) => {
    const s = get();
    const deviceConnected = patch.deviceConnected ?? s.deviceConnected;
    const serverUp = patch.serverUp ?? s.serverUp;
    const isOnline = deviceConnected && serverUp;
    if (deviceConnected === s.deviceConnected && serverUp === s.serverUp && isOnline === s.isOnline) return;
    set({ deviceConnected, serverUp, isOnline, reconnectTick: isOnline && !s.isOnline ? s.reconnectTick + 1 : s.reconnectTick });
    updateProbe();
  };

  // While the phone has a network but the server is not answering, check every
  // few seconds, so syncing starts within moments of the server coming back.
  const updateProbe = () => {
    const { deviceConnected, serverUp } = get();
    const needed = deviceConnected && !serverUp;
    if (needed && !probeTimer) {
      probeTimer = setInterval(async () => {
        if (await pingServer()) apply({ serverUp: true });
      }, PROBE_EVERY_MS);
    } else if (!needed && probeTimer) {
      clearInterval(probeTimer);
      probeTimer = null;
    }
  };

  // Every real request reports whether the server answered.
  setReachabilityHandler((up) => apply({ serverUp: up }));

  return {
    deviceConnected: true,
    serverUp: true,
    isOnline: true,
    reconnectTick: 0,

    startMonitoring: () =>
      NetInfo.addEventListener((state) => {
        const connected = state.isConnected !== false;
        const was = get().deviceConnected;
        apply({ deviceConnected: connected });
        // A network just appeared: find out right away whether the server is on it.
        if (connected && !was) pingServer().then(up => apply({ serverUp: up }));
      }),
  };
});

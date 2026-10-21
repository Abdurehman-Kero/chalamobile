import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SyncSheet } from './SyncSheet';
import { useOutboxCounts } from '../offline/engine';
import { useConnectivityStore } from '../store/connectivityStore';
import { colors } from '../theme';

// One strip at the top of every screen that tells the truth about connection and
// syncing. While online it stays out of the way: changes are sent immediately, so
// at most you see "Syncing…" for a moment. It opens the list of waiting changes
// when there is something to see.
export const OfflineBanner: React.FC = () => {
  const isOnline = useConnectivityStore(s => s.isOnline);
  const deviceConnected = useConnectivityStore(s => s.deviceConnected);
  const { pending, failed } = useOutboxCounts();
  const [open, setOpen] = useState(false);

  const changes = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`;
  let tone: 'amber' | 'red' | null = null;
  let message = '';
  let busy = false;
  let action = '';

  if (failed > 0) {
    tone = 'red';
    message = `${changes(failed)} couldn’t be saved`;
    action = 'Review';
  } else if (isOnline && pending > 0) {
    // Online: they are being sent right now.
    tone = 'amber';
    message = `Syncing ${changes(pending)}…`;
    busy = true;
  } else if (!isOnline) {
    tone = 'amber';
    const where = deviceConnected ? 'Can’t reach the server' : 'You’re offline';
    message = pending > 0
      ? `${where} · ${changes(pending)} saved on this phone, will sync automatically`
      : `${where}. You can keep working; changes sync automatically later.`;
    action = pending > 0 ? 'View' : '';
  }

  if (!tone) return <SyncSheet visible={open} onClose={() => setOpen(false)} />;

  const isRed = tone === 'red';
  const tappable = !!action;

  return (
    <>
      <TouchableOpacity
        style={[styles.banner, isRed && styles.bannerRed]}
        activeOpacity={0.8}
        disabled={!tappable}
        onPress={() => setOpen(true)}
        accessibilityRole={tappable ? 'button' : 'alert'}
        accessibilityLabel={message}
      >
        {busy
          ? <ActivityIndicator size="small" color={colors.amberDark} style={styles.icon} />
          : <Text style={styles.icon}>{isRed ? '⚠️' : '📴'}</Text>}
        <Text style={[styles.text, isRed && styles.textRed]}>{message}</Text>
        {tappable && <Text style={[styles.action, isRed && styles.textRed]}>{action} ›</Text>}
      </TouchableOpacity>
      <SyncSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amberSoft,
    borderBottomWidth: 1,
    borderColor: colors.amberBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
  },
  bannerRed: { backgroundColor: colors.redSoft, borderColor: colors.redBorder },
  icon: { fontSize: 14, marginRight: 8 },
  text: { flex: 1, color: colors.amberDark, fontSize: 12, fontWeight: '700' },
  textRed: { color: colors.redDark },
  action: { color: colors.amberDark, fontSize: 12, fontWeight: '800', marginLeft: 8 },
});

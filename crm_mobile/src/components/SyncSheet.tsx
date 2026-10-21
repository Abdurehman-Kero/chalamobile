import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CenterModal } from './CenterModal';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { discardOp, processQueue, retryOp, useOutboxCounts } from '../offline/engine';
import { OPS } from '../offline/operations';
import { isLocalId } from '../offline/types';
import { useConnectivityStore } from '../store/connectivityStore';
import { timeAgo } from '../utils/formatDate';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Everything made on this phone that the server has not accepted yet.
export const SyncSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { ops, pending, running } = useOutboxCounts();
  const online = useConnectivityStore(s => s.isOnline);

  return (
    <CenterModal
      visible={visible}
      onClose={onClose}
      title="Waiting to sync"
      footer={pending > 0 ? (
        <Button
          title={online ? 'Sync now' : 'Waiting for a connection'}
          onPress={() => processQueue()}
          loading={running}
          disabled={!online}
        />
      ) : undefined}
    >
      {ops.length === 0 ? (
        <EmptyState emoji="✅" title="Everything is synced" message="All changes made on this phone are saved on the server." />
      ) : (
        <>
          <Text style={styles.intro}>
            {online
              ? 'These changes are saved on this phone and are being sent to the server.'
              : 'You are offline. These changes are saved on this phone and will be sent when you are back online.'}
          </Text>
          {ops.map((op, i) => (
            <View key={op.id} style={[styles.row, i === ops.length - 1 && styles.rowLast]}>
              <View style={styles.body}>
                <Text style={styles.label} numberOfLines={2}>{OPS[op.type].label(op.payload)}</Text>
                <Text style={styles.meta}>
                  {timeAgo(new Date(op.createdAt))}{op.localId && isLocalId(op.localId) ? ' · new' : ''}
                </Text>
                {op.status === 'failed' && <Text style={styles.error}>{op.error}</Text>}
              </View>
              {op.status === 'failed' ? (
                <View style={styles.actions}>
                  <Button title="Retry" size="sm" variant="secondary" onPress={() => retryOp(op.id)} />
                  <Button title="Discard" size="sm" variant="danger" onPress={() => discardOp(op.id)} style={styles.discard} />
                </View>
              ) : (
                <View style={styles.waiting}><Text style={styles.waitingText}>Waiting</Text></View>
              )}
            </View>
          ))}
        </>
      )}
    </CenterModal>
  );
};

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.text2, lineHeight: 20, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  body: { flex: 1, marginRight: spacing.md },
  label: { fontSize: 14, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, color: colors.text3, marginTop: 2 },
  error: { fontSize: 13, color: colors.redDark, marginTop: 4, fontWeight: '600', lineHeight: 18 },
  actions: { alignItems: 'flex-end' },
  discard: { marginTop: 6 },
  waiting: { backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amberBorder, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  waitingText: { fontSize: 12, fontWeight: '700', color: colors.amberDark },
});

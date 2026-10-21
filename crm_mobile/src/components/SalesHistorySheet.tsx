import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CenterModal } from './CenterModal';
import { EmptyState } from './EmptyState';
import { InlineNotice } from './InlineNotice';
import * as salesApi from '../api/sales';
import { getErrorMessage } from '../api/errors';
import { formatBr } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import { colors, spacing } from '../theme';

export const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', telebirr: 'Telebirr', cbe: 'CBE' };

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const SalesHistorySheet: React.FC<Props> = ({ visible, onClose }) => {
  const [sales, setSales] = useState<salesApi.Sale[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setSales(await salesApi.getSales()); }
    catch (e) { setError(getErrorMessage(e)); }
  }, []);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  return (
    <CenterModal visible={visible} onClose={onClose} title="Recent sales">
      {error && <InlineNotice message={error} onRetry={load} />}
      {!sales && !error && <ActivityIndicator color={colors.red} style={{ marginVertical: spacing['3xl'] }} />}
      {sales && sales.length === 0 && (
        <EmptyState emoji="🧾" title="No sales yet" message="Completed sales will be listed here." />
      )}
      {sales?.map((s, i) => (
        <View key={s.id} style={[styles.row, i === sales.length - 1 && styles.rowLast]}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.summary} numberOfLines={2}>{s.summary || 'Sale'}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {s.customer_name || 'Walk-in'} · {PAYMENT_LABELS[s.payment_method] || s.payment_method} · {timeAgo(s.created_at)}
            </Text>
          </View>
          <Text style={styles.amount}>{formatBr(s.total)}</Text>
        </View>
      ))}
    </CenterModal>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  summary: { fontSize: 14, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, color: colors.text2, marginTop: 3 },
  amount: { fontSize: 14, fontWeight: '800', color: colors.greenDark },
});

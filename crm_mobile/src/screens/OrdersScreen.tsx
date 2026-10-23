import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ordersApi from '../api/orders';
import { Order, OrderStatus } from '../api/orders';
import { getErrorMessage } from '../api/errors';
import { useResource } from '../hooks/useResource';
import { toast } from '../store/toastStore';
import { OfflineBanner } from '../components/OfflineBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { ChipRow, ChipItem } from '../components/ChipRow';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TopLoader } from '../components/TopLoader';
import { PAYMENT_LABELS } from '../components/SalesHistorySheet';
import { formatBr } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import { Tone, colors, radius, shadow, spacing, layout } from '../theme';

const ALL = 'all';

const STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending:   { label: 'New',       tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'blue' },
  ready:     { label: 'Ready',     tone: 'purple' },
  delivered: { label: 'Delivered', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

// What the shop can do next with an order in each state.
const ACTIONS: Record<OrderStatus, { status: OrderStatus; title: string; variant: 'primary' | 'secondary' | 'dark' }[]> = {
  pending:   [{ status: 'confirmed', title: 'Confirm order', variant: 'dark' }, { status: 'cancelled', title: 'Cancel', variant: 'secondary' }],
  confirmed: [{ status: 'ready', title: 'Mark ready', variant: 'dark' }, { status: 'delivered', title: 'Delivered', variant: 'secondary' }],
  ready:     [{ status: 'delivered', title: 'Mark delivered', variant: 'dark' }],
  delivered: [],
  cancelled: [],
};

export default function OrdersScreen() {
  const navigation: any = useNavigation();
  const { data, error, loading, refreshing, fetching, refresh, reload } = useResource('orders', ordersApi.getOrders);
  const [filter, setFilter] = useState(ALL);
  const [busyId, setBusyId] = useState<number | null>(null);

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);
  const visible = useMemo(() => (filter === ALL ? orders : orders.filter(o => o.status === filter)), [orders, filter]);

  const chips: ChipItem[] = [
    { key: ALL, label: 'All', count: orders.length },
    ...(['pending', 'confirmed', 'ready', 'delivered', 'cancelled'] as OrderStatus[])
      .filter(s => counts[s])
      .map(s => ({ key: s, label: STATUS[s].label, count: counts[s] })),
  ];

  const change = async (order: Order, status: OrderStatus) => {
    setBusyId(order.id);
    try {
      await ordersApi.setOrderStatus(order.id, status);
      toast.success(status === 'confirmed' ? 'Order confirmed and recorded as a sale' : 'Order updated');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the order'));
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const s = STATUS[item.status];
    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.number}>{item.order_number}</Text>
            <Text style={styles.meta}>{timeAgo(item.created_at)}</Text>
          </View>
          <Badge label={s.label} variant={s.tone} />
        </View>

        <Text style={styles.customer}>{item.customer_name}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)} accessibilityRole="link" accessibilityLabel={`Call ${item.customer_name}`}>
          <Text style={styles.phone}>📞 {item.phone}</Text>
        </TouchableOpacity>
        <Text style={styles.meta}>
          {item.delivery_method === 'delivery' ? `🚚 Deliver to ${item.address}` : '🏬 Pick up in shop'}
        </Text>

        <View style={styles.items}>
          {item.items.map(i => (
            <View key={i.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>{i.qty} × {i.name}</Text>
              <Text style={styles.itemPrice}>{formatBr(i.qty * i.unit_price)}</Text>
            </View>
          ))}
        </View>
        {item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}

        <View style={styles.totalRow}>
          <Text style={styles.payment}>{PAYMENT_LABELS[item.payment_method] || item.payment_method}</Text>
          <Text style={styles.total}>{formatBr(item.total)}</Text>
        </View>

        {ACTIONS[item.status].length > 0 && (
          <View style={styles.actions}>
            {ACTIONS[item.status].map(a => (
              <Button
                key={a.status} title={a.title} variant={a.variant} size="sm"
                loading={busyId === item.id} disabled={busyId !== null}
                onPress={() => change(item, a.status)} style={styles.actionBtn}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const empty = loading && !data ? (
    <LoadingState label="Loading orders…" />
  ) : error && !data ? (
    <EmptyState emoji="📡" title="Can't load orders" message={error} actionLabel="Try again" onAction={reload} />
  ) : (
    <EmptyState emoji="🛍️" title="No orders here" message="Orders placed on the web store show up here." />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <ScreenHeader
        title="Online orders"
        subtitle={data ? `${data.pending} waiting for you` : undefined}
        right={<Button title="Back" size="sm" variant="secondary" onPress={() => navigation.goBack()} />}
      />
      <ChipRow items={chips} selected={filter} onSelect={setFilter} />
      <TopLoader active={fetching && !!data} />
      <FlatList
        data={visible}
        keyExtractor={o => String(o.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} />}
        ListHeaderComponent={error && data ? <InlineNotice message="Couldn't refresh. Showing saved orders." onRetry={reload} /> : undefined}
        ListEmptyComponent={empty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  list: { paddingHorizontal: layout.screenX, paddingTop: spacing.lg, paddingBottom: layout.bottomGap, flexGrow: 1 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  headText: { flex: 1, marginRight: spacing.md },
  number: { fontSize: 16, fontWeight: '900', color: colors.navy },
  meta: { fontSize: 13, color: colors.text2, marginTop: 2 },
  customer: { fontSize: 15, fontWeight: '800', color: colors.navy },
  phone: { fontSize: 14, fontWeight: '700', color: colors.blueDark, marginTop: 2, paddingVertical: 4 },
  items: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  itemName: { flex: 1, fontSize: 14, color: colors.text1, marginRight: spacing.md },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.navy },
  note: { fontSize: 13, color: colors.text2, fontStyle: 'italic', marginTop: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  payment: { fontSize: 13, fontWeight: '700', color: colors.text2 },
  total: { fontSize: 17, fontWeight: '900', color: colors.navy },
  actions: { flexDirection: 'row', marginTop: spacing.md },
  actionBtn: { flex: 1, marginRight: spacing.sm },
});

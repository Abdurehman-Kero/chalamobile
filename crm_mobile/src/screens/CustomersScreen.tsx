import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Linking, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as customersApi from '../api/customers';
import * as offline from '../offline/mutations';
import { overlayCustomers } from '../offline/overlays';
import { isLocalId } from '../offline/types';
import { Customer, CustomerDetail } from '../api/customers';
import { getErrorMessage } from '../api/errors';
import { useResource } from '../hooks/useResource';
import { useRole } from '../hooks/useRole';
import { toast } from '../store/toastStore';
import { OfflineBanner } from '../components/OfflineBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBar } from '../components/SearchBar';
import { ChipRow } from '../components/ChipRow';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { Badge } from '../components/Badge';
import { PendingBadge } from '../components/PendingBadge';
import { FormModal } from '../components/FormModal';
import { CenterModal } from '../components/CenterModal';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { MetricCard } from '../components/MetricCard';
import { PAYMENT_LABELS } from '../components/SalesHistorySheet';
import { TopLoader } from '../components/TopLoader';
import { FadeInView, rowDelay } from '../components/FadeInView';
import { formatBr, formatBrCompact } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { tx, useT } from '../i18n';
import { colors, avatarColors, spacing, radius, shadow, layout } from '../theme';

const avatarColor = (id: number) => avatarColors[id % avatarColors.length];

const REPAIR_LABEL: Record<string, string> = {
  received: tx('Received'), diagnosing: tx('Diagnosing'), fixing: tx('Fixing'), completed: tx('Ready'), delivered: tx('Delivered'),
};

type Filter = 'all' | 'vip' | 'top';

export default function CustomersScreen() {
  const t = useT();
  const route: any = useRoute();
  const navigation: any = useNavigation();

  const { canManageCustomers } = useRole();
  const { data, error, loading, refreshing, fetching, refresh, reload } = useResource('customers', customersApi.getCustomers, overlayCustomers);
  const customers = useMemo(() => data ?? [], [data]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  const openForm = useCallback((c: Customer | null) => {
    setEditing(c);
    setName(c?.name ?? ''); setPhone(c?.phone ?? ''); setAddress(c?.address ?? '');
    setErrors({});
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (route.params?.openAdd) { openForm(null); navigation.setParams({ openAdd: undefined }); }
  }, [route.params?.openAdd, openForm, navigation]);

  const loadDetail = useCallback(async (id: number) => {
    setDetailError(null);
    try { setDetail(await customersApi.getCustomer(id)); }
    catch (e) { setDetailError(getErrorMessage(e)); }
  }, []);

  const openDetail = (c: Customer) => {
    setSelectedId(c.id);
    setDetail(null);
    // A client created offline has no history on the server yet.
    if (!isLocalId(c.id)) loadDetail(c.id);
  };

  const selected = selectedId == null ? null : customers.find(c => c.id === selectedId) ?? null;

  const stats = useMemo(() => ({
    vip: customers.filter(c => c.is_vip).length,
    revenue: customers.reduce((s, c) => s + c.total_spent, 0),
  }), [customers]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers.filter(c => !q || c.name.toLowerCase().includes(q) || (c.phone || '').replace(/\s/g, '').includes(q.replace(/\s/g, '')));
    if (filter === 'vip') list = list.filter(c => c.is_vip);
    if (filter === 'top') list = [...list].sort((a, b) => b.total_spent - a.total_spent);
    return list;
  }, [customers, search, filter]);

  const save = async () => {
    const e: { name?: string; phone?: string } = {};
    if (!name.trim()) e.name = t('Enter the customer’s name');
    setErrors(e);
    if (e.name) return;
    setSaving(true);
    try {
      let out;
      if (editing) {
        out = await offline.updateCustomer(editing.id, { name: name.trim(), phone: phone.trim(), address: address.trim() });
        if (!isLocalId(editing.id)) loadDetail(editing.id);
      } else {
        out = await offline.createCustomer({ name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined });
      }
      setFormOpen(false);
      toast.success(offline.savedMessage(out, editing ? t('Customer updated') : t('Customer added')));
      reload();
    } catch (err: any) {
      const msg = getErrorMessage(err, t('Could not save the customer'));
      if (err?.response?.data?.code === 'DUPLICATE_PHONE') setErrors({ phone: msg });
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleVip = async (c: Customer, value: boolean) => {
    try {
      const out = await offline.updateCustomer(c.id, { is_vip: value });
      if (out.queued) toast.success(offline.savedMessage(out, ''));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, t('Could not update the customer')));
    }
  };

  const call = (p: string) => Linking.openURL(`tel:${p.replace(/\s+/g, '')}`).catch(() => toast.error(t('Could not open the phone app')));

  const renderItem = ({ item, index }: { item: Customer; index: number }) => (
    <FadeInView delay={rowDelay(index)}>
    <TouchableOpacity style={[styles.card, shadow.sm]} onPress={() => openDetail(item)} activeOpacity={0.75} accessibilityRole="button">
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.id) }]}>
        <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <View style={styles.nameRow}>
          <Text style={styles.custName} numberOfLines={1}>{item.name}</Text>
          {item.is_vip && <Badge label="⭐ VIP" variant="amber" style={{ marginLeft: 8 }} />}
          {isLocalId(item.id) && <PendingBadge style={{ marginLeft: 8 }} />}
        </View>
        <Text style={styles.phone}>{item.phone || t('No phone')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.spent}>{formatBr(item.total_spent)}</Text>
        <Text style={styles.buys}>{t(item.buy_count === 1 ? tx('{n} purchase') : tx('{n} purchases'), { n: item.buy_count })}</Text>
      </View>
    </TouchableOpacity>
    </FadeInView>
  );

  const emptyList = loading && !data ? (
    <LoadingState label={t('Loading clients…')} />
  ) : error && !data ? (
    <EmptyState emoji="📡" title={t("Can't load clients")} message={error} actionLabel={t('Try again')} onAction={reload} />
  ) : customers.length === 0 ? (
    <EmptyState emoji="👥" title={t('No clients yet')} message={t('Save your customers to track their purchases and repairs.')} actionLabel={t('Add client')} onAction={() => openForm(null)} />
  ) : (
    <EmptyState emoji="🔍" title={t('No matches')} message={filter === 'vip' && !search ? t('No VIP clients yet. Open a client to mark them as VIP.') : t('Try a different search.')} />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <ScreenHeader
        title={t('Clients')}
        subtitle={data ? t('{n} registered', { n: customers.length }) : undefined}
        right={<Button title={t('+ Add')} size="sm" onPress={() => openForm(null)} />}
      />
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Search name or phone')} />
      </View>
      <ChipRow
        items={[
          { key: 'all', label: t('All'), count: customers.length },
          { key: 'vip', label: '⭐ VIP', count: stats.vip },
          { key: 'top', label: `💰 ${t('Top spenders')}` },
        ]}
        selected={filter}
        onSelect={k => setFilter(k as Filter)}
      />
      <TopLoader active={fetching && !!data} />

      <FlatList
        data={visible}
        keyExtractor={c => String(c.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} />}
        ListHeaderComponent={
          <>
            {error && data ? <InlineNotice message={t("Couldn't refresh. Showing saved clients.")} onRetry={reload} /> : null}
            {data && customers.length > 0 && (
              <View style={styles.summary}>
                <MetricCard icon="👥" label={t('Clients')} value={customers.length} variant="blue" style={{ marginRight: spacing.sm }} />
                <MetricCard icon="⭐" label="VIP" value={stats.vip} variant="amber" style={{ marginRight: spacing.sm }} />
                <MetricCard icon="💰" label={t('Lifetime sales')} value={formatBrCompact(stats.revenue)} variant="green" />
              </View>
            )}
          </>
        }
        ListEmptyComponent={emptyList}
      />

      {/* Detail */}
      <CenterModal visible={!!selected} onClose={() => { setSelectedId(null); setDetail(null); }} title={t('Client')}>
        {selected && (
          <View>
            <View style={styles.detailHead}>
              <View style={[styles.avatar, styles.avatarLg, { backgroundColor: avatarColor(selected.id) }]}>
                <Text style={[styles.avatarText, { fontSize: 28 }]}>{selected.name[0]?.toUpperCase()}</Text>
              </View>
              <Text style={styles.detailName}>{selected.name}</Text>
              <Text style={styles.detailPhone}>{selected.phone || t('No phone number')}</Text>
              {selected.address ? <Text style={styles.detailAddress}>📍 {selected.address}</Text> : null}
            </View>

            <View style={styles.detailStats}>
              <MetricCard icon="💰" label={t('Total spent')} value={formatBr(selected.total_spent)} variant="green" style={{ marginRight: spacing.sm }} />
              <MetricCard icon="🛍️" label={t('Purchases')} value={selected.buy_count} variant="blue" />
            </View>

            <View style={styles.actions}>
              {selected.phone ? <Button title={t('Call')} icon="📞" variant="secondary" onPress={() => call(selected.phone!)} style={styles.actionBtn} /> : null}
              {canManageCustomers && <Button title={t('Edit')} icon="✏️" variant="secondary" onPress={() => openForm(selected)} style={styles.actionBtn} />}
            </View>

            {canManageCustomers && (
            <View style={styles.vipRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vipTitle}>⭐ {t('VIP client')}</Text>
                <Text style={styles.vipSub}>{t('Highlight loyal customers in your list')}</Text>
              </View>
              <Switch value={selected.is_vip} onValueChange={v => toggleVip(selected, v)} trackColor={{ false: colors.border2, true: colors.amber }} thumbColor={colors.white} />
            </View>
            )}

            {!detail && !detailError && <ActivityIndicator color={colors.red} style={{ marginVertical: spacing.lg }} />}
            {detailError && <InlineNotice message={detailError} onRetry={() => loadDetail(selected.id)} />}

            {detail && (
              <>
                <Text style={styles.histTitle}>{t('Purchases')}</Text>
                {detail.sales.length === 0 ? (
                  <Text style={styles.histEmpty}>{t('No purchases linked to this client yet. Link them when you make a sale.')}</Text>
                ) : detail.sales.map(s => (
                  <View key={s.id} style={styles.histRow}>
                    <View style={{ flex: 1, marginRight: spacing.md }}>
                      <Text style={styles.histItem} numberOfLines={2}>{s.summary || t('Sale')}</Text>
                      <Text style={styles.histMeta}>{formatDate(s.created_at)} · {t(PAYMENT_LABELS[s.payment_method] || s.payment_method)}</Text>
                    </View>
                    <Text style={styles.histAmt}>{formatBr(s.total)}</Text>
                  </View>
                ))}

                {detail.repairs.length > 0 && (
                  <>
                    <Text style={[styles.histTitle, { marginTop: spacing.lg }]}>{t('Repairs')}</Text>
                    {detail.repairs.map(r => (
                      <View key={r.id} style={styles.histRow}>
                        <View style={{ flex: 1, marginRight: spacing.md }}>
                          <Text style={styles.histItem} numberOfLines={1}>{r.device_name}</Text>
                          <Text style={styles.histMeta}>{r.ticket_number} · {formatDate(r.received_at)}</Text>
                        </View>
                        <Badge label={t(REPAIR_LABEL[r.status] || r.status)} variant={r.status === 'delivered' ? 'neutral' : r.status === 'completed' ? 'green' : 'amber'} />
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}
      </CenterModal>

      {/* Add / edit */}
      <FormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('Edit client') : t('Add client')}
        subtitle={editing ? editing.name : t('Save a customer’s details')}
        footer={<Button title={editing ? t('Save changes') : t('Add client')} onPress={save} loading={saving} />}
      >
        <FormInput label={t('Full name *')} value={name} onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: undefined })); }} placeholder="Ahmed Musa" autoCapitalize="words" error={errors.name} />
        <FormInput label={t('Phone')} value={phone} onChangeText={v => { setPhone(v); setErrors(e => ({ ...e, phone: undefined })); }} placeholder="0911 234 567" keyboardType="phone-pad" error={errors.phone} />
        <FormInput label={t('Address')} value={address} onChangeText={setAddress} placeholder="Addis Ababa" />
      </FormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  searchWrap: { paddingHorizontal: layout.screenX, paddingBottom: spacing.md, backgroundColor: colors.white },
  listContent: { paddingHorizontal: layout.screenX, paddingTop: spacing.lg, paddingBottom: layout.bottomGap, flexGrow: 1 },
  summary: { flexDirection: 'row', marginBottom: spacing.lg },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, minHeight: 68,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarLg: { width: 76, height: 76, borderRadius: 38, marginRight: 0, marginBottom: 10 },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  custName: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  phone: { fontSize: 13, color: colors.text2, marginTop: 2 },
  spent: { fontSize: 14, fontWeight: '900', color: colors.navy },
  buys: { fontSize: 12, color: colors.text2, marginTop: 2 },

  detailHead: { alignItems: 'center', marginBottom: spacing.lg },
  detailName: { fontSize: 22, fontWeight: '900', color: colors.navy },
  detailPhone: { fontSize: 15, color: colors.text2, marginTop: 4 },
  detailAddress: { fontSize: 13, color: colors.text2, marginTop: 4 },
  detailStats: { flexDirection: 'row', marginBottom: spacing.lg },
  actions: { flexDirection: 'row', marginBottom: spacing.lg },
  actionBtn: { flex: 1, marginRight: spacing.sm },
  vipRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xl,
  },
  vipTitle: { fontSize: 14, fontWeight: '800', color: colors.navy },
  vipSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  histTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: spacing.sm },
  histEmpty: { fontSize: 14, color: colors.text2, lineHeight: 20 },
  histRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  histItem: { fontSize: 14, fontWeight: '700', color: colors.navy },
  histMeta: { fontSize: 12, color: colors.text2, marginTop: 2 },
  histAmt: { fontSize: 14, fontWeight: '800', color: colors.greenDark },
});

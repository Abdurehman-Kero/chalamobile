import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as reportsApi from '../api/reports';
import { getErrorMessage } from '../api/errors';
import { useResource } from '../hooks/useResource';
import { toast } from '../store/toastStore';
import { OfflineBanner } from '../components/OfflineBanner';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { PAYMENT_LABELS } from '../components/SalesHistorySheet';
import { TopLoader } from '../components/TopLoader';
import { formatBr } from '../utils/formatCurrency';
import { addDaysYmd, formatDay, formatDayRelative, todayYmd } from '../utils/formatDate';
import { colors, spacing, radius, shadow, layout } from '../theme';

type Tab = 'sales' | 'repairs' | 'bought';

const timeOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

const STATUS_LABEL: Record<string, string> = {
  received: 'Received', diagnosing: 'Diagnosing', fixing: 'Fixing', completed: 'Ready', delivered: 'Handed over',
};

// Remounts when the day changes, so a previous day's figures never show under a new date.
export default function ReportScreen() {
  const [date, setDate] = useState(todayYmd());
  return <ReportContent key={date} date={date} setDate={setDate} />;
}

function ReportContent({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const navigation: any = useNavigation();
  const [tab, setTab] = useState<Tab>('sales');
  const [exporting, setExporting] = useState<'pdf' | 'image' | null>(null);

  const { data, error, loading, refreshing, fetching, refresh, reload } = useResource(
    `report:${date}`,
    () => reportsApi.getDailyReport(date),
  );
  const isToday = date === todayYmd();
  const s = data?.summary;

  const tabs: { key: Tab; label: string; count: number }[] = useMemo(() => [
    { key: 'sales', label: 'Sold', count: data?.sales.length ?? 0 },
    { key: 'repairs', label: 'Repaired', count: data?.repairs.length ?? 0 },
    { key: 'bought', label: 'Bought', count: data?.purchases.length ?? 0 },
  ], [data]);

  // PDF and image are opened in the phone's browser, where they can be saved or shared.
  const openExport = async (kind: 'pdf' | 'image') => {
    setExporting(kind);
    try {
      const links = await reportsApi.getExportLinks(date);
      await Linking.openURL(kind === 'pdf' ? links.pdf : links.image);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create the file'));
    } finally {
      setExporting(null);
    }
  };

  const shareText = async () => {
    if (!data || !s) return;
    const lines = [
      `ChalaMob · Daily report`,
      formatDay(data.date) + (isToday ? ' (today)' : ''),
      '',
      `Revenue: ${formatBr(s.total_revenue)}`,
      `  Sales: ${formatBr(s.sales_revenue)}`,
      `  Repairs: ${formatBr(s.repair_revenue)}`,
      `Spent on stock: ${formatBr(s.purchases_total)}`,
      `Profit: ${formatBr(s.total_profit)}`,
      '',
      `${data.sales.length} sales · ${s.units_sold} units`,
      `${data.repairs.length} repairs · ${s.repairs_delivered} handed over`,
      `${data.purchases.length} purchases`,
    ];
    try { await Share.share({ message: lines.join('\n'), title: 'Daily report' }); } catch { /* user closed the sheet */ }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <OfflineBanner />

      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.titles}>
          <Text style={styles.title}>Daily report</Text>
          <Text style={styles.sub}>{formatDay(date)}</Text>
        </View>
        <View style={styles.dayNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setDate(addDaysYmd(date, -1))} accessibilityLabel="Previous day">
            <Text style={styles.navIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.navLabel}>{formatDayRelative(date)}</Text>
          <TouchableOpacity style={[styles.navBtn, isToday && styles.navOff]} disabled={isToday} onPress={() => setDate(addDaysYmd(date, 1))} accessibilityLabel="Next day">
            <Text style={styles.navIcon}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TopLoader active={fetching && !!data} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} />}
      >
        {loading && !data && <LoadingState variant="home" label="Building the report…" />}
        {error && !data && <EmptyState emoji="📡" title="Can't load the report" message={error} actionLabel="Try again" onAction={reload} />}

        {data && s && (
          <View>
            {error && <InlineNotice message="Couldn't refresh. Showing the saved report." onRetry={reload} />}

            {/* Money in, split by where it came from */}
            <View style={[styles.hero, shadow.md]}>
              <View style={styles.heroAccent} />
              <Text style={styles.heroLabel}>Total revenue</Text>
              <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatBr(s.total_revenue)}</Text>
              <View style={styles.split}>
                <View style={styles.splitCol}>
                  <Text style={styles.splitLabel}>🛒 From sales</Text>
                  <Text style={styles.splitValue}>{formatBr(s.sales_revenue)}</Text>
                </View>
                <View style={styles.splitLine} />
                <View style={styles.splitCol}>
                  <Text style={styles.splitLabel}>🔧 From repairs</Text>
                  <Text style={styles.splitValue}>{formatBr(s.repair_revenue)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.pair}>
              <View style={[styles.stat, shadow.sm, styles.statGap]}>
                <Text style={styles.statLabel}>Profit</Text>
                <Text style={[styles.statValue, { color: s.total_profit >= 0 ? colors.greenDark : colors.redDark }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatBr(s.total_profit)}
                </Text>
                <Text style={styles.statHint}>Sales {formatBr(s.sales_profit)} · Repairs {formatBr(s.repair_profit)}</Text>
              </View>
              <View style={[styles.stat, shadow.sm]}>
                <Text style={styles.statLabel}>Spent on stock</Text>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatBr(s.purchases_total)}</Text>
                <Text style={styles.statHint}>{s.purchases_count} {s.purchases_count === 1 ? 'purchase' : 'purchases'}</Text>
              </View>
            </View>

            {/* What happened */}
            <View style={styles.segment} accessibilityRole="tablist">
              {tabs.map(t => {
                const active = t.key === tab;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.seg, active && styles.segActive]}
                    onPress={() => setTab(t.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>{t.label}</Text>
                    <View style={[styles.segCount, active && styles.segCountActive]}>
                      <Text style={[styles.segCountText, active && styles.segTextActive]}>{t.count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tab === 'sales' && (data.sales.length === 0
              ? <EmptyState emoji="🛒" title="Nothing sold" message={isToday ? 'Sales made today will appear here.' : 'No sales on this day.'} />
              : data.sales.map(x => (
                <View key={x.id} style={[styles.row, shadow.sm]}>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={2}>{x.items.map(i => `${i.name} ×${i.qty}`).join(', ') || 'Sale'}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {timeOf(x.time)} · {x.customer} · {PAYMENT_LABELS[x.payment_method] || x.payment_method}{x.sold_by ? ` · ${x.sold_by}` : ''}
                    </Text>
                  </View>
                  <View style={styles.rowEnd}>
                    <Text style={styles.rowAmount}>{formatBr(x.total)}</Text>
                    <Text style={[styles.rowProfit, { color: x.profit >= 0 ? colors.greenDark : colors.redDark }]}>+{formatBr(x.profit)}</Text>
                  </View>
                </View>
              )))}

            {tab === 'repairs' && (data.repairs.length === 0
              ? <EmptyState emoji="🔧" title="No repairs" message={isToday ? 'Repairs finished or handed over today will appear here.' : 'No repairs finished on this day.'} />
              : data.repairs.map(x => (
                <View key={x.id} style={[styles.row, shadow.sm]}>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{x.device_name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {x.ticket_number} · {x.customer_name || 'No name'}{x.technician_name ? ` · ${x.technician_name}` : ''}
                    </Text>
                  </View>
                  <View style={styles.rowEnd}>
                    {x.delivered_today
                      ? <Text style={styles.rowAmount}>{formatBr(x.amount)}</Text>
                      : <Badge label={STATUS_LABEL[x.status] || x.status} variant="green" />}
                    {x.delivered_today && x.profit != null && (
                      <Text style={[styles.rowProfit, { color: x.profit >= 0 ? colors.greenDark : colors.redDark }]}>+{formatBr(x.profit)}</Text>
                    )}
                  </View>
                </View>
              )))}

            {tab === 'bought' && (data.purchases.length === 0
              ? <EmptyState emoji="📦" title="No stock bought" message={isToday ? 'Stock you add or restock today will appear here.' : 'No purchases on this day.'} />
              : data.purchases.map(x => (
                <View key={x.id} style={[styles.row, shadow.sm]}>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={2}>{x.product_name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {timeOf(x.time)} · {x.qty} × {formatBr(x.unit_cost)}{x.supplier ? ` · ${x.supplier}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatBr(x.total)}</Text>
                </View>
              )))}
          </View>
        )}
      </ScrollView>

      {/* Export */}
      <View style={styles.footer}>
        <Button title="PDF" icon="📄" variant="secondary" onPress={() => openExport('pdf')} loading={exporting === 'pdf'} disabled={!data} style={styles.footBtn} />
        <Button title="Image" icon="🖼️" variant="secondary" onPress={() => openExport('image')} loading={exporting === 'image'} disabled={!data} style={styles.footBtn} />
        <Button title="Share" icon="📤" onPress={shareText} disabled={!data} style={styles.footBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border,
    paddingHorizontal: layout.screenX, paddingTop: layout.topGap + spacing.sm, paddingBottom: spacing.md,
  },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  backIcon: { fontSize: 28, color: colors.navy, marginTop: -3 },
  titles: { flex: 1 },
  title: { fontSize: 20, fontWeight: '900', color: colors.navy },
  sub: { fontSize: 13, color: colors.text2, marginTop: 1 },
  dayNav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center' },
  navOff: { opacity: 0.3 },
  navIcon: { fontSize: 22, color: colors.navy, marginTop: -2 },
  navLabel: { minWidth: 70, textAlign: 'center', fontSize: 13, fontWeight: '800', color: colors.navy },

  scroll: { paddingHorizontal: layout.screenX, paddingTop: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },

  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.md, overflow: 'hidden' },
  heroAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: colors.red },
  heroLabel: { fontSize: 13, color: colors.onNavy, fontWeight: '700' },
  heroValue: { fontSize: 36, fontWeight: '900', color: colors.white, marginTop: 4 },
  split: { flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderColor: colors.onNavyLine },
  splitCol: { flex: 1 },
  splitLine: { width: 1, backgroundColor: colors.onNavyLine, marginHorizontal: spacing.lg },
  splitLabel: { fontSize: 12, color: colors.onNavy, fontWeight: '700' },
  splitValue: { fontSize: 18, fontWeight: '800', color: colors.white, marginTop: 3 },

  pair: { flexDirection: 'row', marginBottom: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  statGap: { marginRight: spacing.md },
  statLabel: { fontSize: 13, color: colors.text2, fontWeight: '700' },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.navy, marginTop: 4 },
  statHint: { fontSize: 11, color: colors.text3, marginTop: 4, fontWeight: '600' },

  segment: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: spacing.lg },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: radius.sm },
  segActive: { backgroundColor: colors.navy },
  segText: { fontSize: 14, fontWeight: '700', color: colors.text2 },
  segTextActive: { color: colors.white },
  segCount: { minWidth: 22, height: 22, borderRadius: 11, marginLeft: 6, paddingHorizontal: 6, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center' },
  segCountActive: { backgroundColor: colors.onNavyChip },
  segCountText: { fontSize: 12, fontWeight: '800', color: colors.text2 },

  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, minHeight: 64,
  },
  rowBody: { flex: 1, marginRight: spacing.md },
  rowTitle: { fontSize: 14, fontWeight: '800', color: colors.navy },
  rowMeta: { fontSize: 12, color: colors.text2, marginTop: 3 },
  rowEnd: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 14, fontWeight: '900', color: colors.navy },
  rowProfit: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  footer: {
    flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border,
    paddingHorizontal: layout.screenX, paddingVertical: spacing.md,
  },
  footBtn: { flex: 1, marginHorizontal: 4 },
});


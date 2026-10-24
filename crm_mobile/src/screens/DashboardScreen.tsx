import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useResource } from '../hooks/useResource';
import { useAlerts } from '../hooks/useAlerts';
import { useRole } from '../hooks/useRole';
import * as dashApi from '../api/dashboard';
import * as repairsApi from '../api/repairs';
import * as ordersApi from '../api/orders';
import { overlayRepairs } from '../offline/overlays';
import { MetricCard } from '../components/MetricCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { InlineNotice } from '../components/InlineNotice';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { Badge } from '../components/Badge';
import { CenterModal } from '../components/CenterModal';
import { AlertsSheet } from '../components/AlertsSheet';
import { SalesHistorySheet, PAYMENT_LABELS } from '../components/SalesHistorySheet';
import { TopLoader } from '../components/TopLoader';
import { formatBr, formatBrCompact } from '../utils/formatCurrency';
import { timeAgo, formatDayRelative } from '../utils/formatDate';
import { tx, useT, useLang } from '../i18n';
import { applyReminders } from '../reminders/useReminders';
import { colors, tones, Tone, spacing, radius, shadow, layout } from '../theme';

const CHART_H = 110;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? tx('Good morning') : h < 17 ? tx('Good afternoon') : tx('Good evening');
};

const STAGE_LABEL: Record<string, string> = {
  received: tx('Received'), diagnosing: tx('Diagnosing'), fixing: tx('Fixing'), completed: tx('Ready'), delivered: tx('Delivered'),
};

interface QuickAction { icon: string; tone: Tone; title: string; sub: string; to: string; params?: object }
const ACTIONS: Record<string, QuickAction> = {
  sale:    { icon: '💳', tone: 'green',  title: tx('New sale'),     sub: tx('Open the sales screen'),        to: 'POS' },
  product: { icon: '📦', tone: 'blue',   title: tx('Add product'),  sub: tx('Add an item to your stock'),    to: 'Stock',   params: { openAdd: true } },
  repair:  { icon: '🔧', tone: 'amber',  title: tx('New repair'),   sub: tx('Register a device for repair'), to: 'Repair',  params: { openAdd: true } },
  client:  { icon: '👥', tone: 'purple', title: tx('Add client'),   sub: tx('Save a customer’s details'),    to: 'Clients', params: { openAdd: true } },
  orders:  { icon: '🛍️', tone: 'amber',  title: tx('Online orders'), sub: tx('Orders from the web store'),   to: 'Orders' },
  report:  { icon: '🧾', tone: 'red',    title: tx('Daily report'), sub: tx('Sold, repaired and bought today'), to: 'Report' },
};
const ACTIONS_BY_ROLE = {
  owner: ['sale', 'orders', 'product', 'repair', 'client', 'report'],
  sales: ['sale', 'orders', 'client'],
  technician: ['repair'],
};

export default function DashboardScreen() {
  const t = useT();
  const lang = useLang(s => s.lang);
  const navigation: any = useNavigation();
  const user = useAuthStore(s => s.user);
  const { role, isOwner, isSales, isTechnician } = useRole();

  const dash = useResource('dashboard', () => dashApi.getDashboard(role));
  // The sales desk has no repairs, so there is nothing to fetch for them.
  const repairs = useResource('repairs', () => (isSales ? Promise.resolve([]) : repairsApi.getRepairs()), overlayRepairs);
  const alerts = useAlerts();
  useEffect(() => { applyReminders(repairs.data); }, [repairs.data]);
  // Orders waiting for the shop to confirm (not needed by technicians).
  const orders = useResource('orders', () => (isTechnician ? Promise.resolve({ orders: [], pending: 0 }) : ordersApi.getOrders()));
  const pendingOrders = orders.data?.pending ?? 0;

  const [showActions, setShowActions] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const onRefresh = () => { dash.refresh(); repairs.reload(); alerts.reload(); orders.reload(); };

  // Pop the alerts open once when there is something new, so it is not missed.
  const popped = useRef(false);
  useEffect(() => {
    if (!popped.current && alerts.loaded && alerts.unseen.length > 0) {
      popped.current = true;
      setShowAlerts(true);
    }
  }, [alerts.loaded, alerts.unseen.length]);

  const closeAlerts = () => { setShowAlerts(false); alerts.markSeen(alerts.visible.map(a => a.key)); };

  const data = dash.data;
  const m = data?.metrics;
  const weekly = data?.weekly ?? null;
  const maxVal = weekly ? Math.max(...weekly.values, 1) : 1;
  const recentSales = useMemo(() => data?.activity.filter(a => a.type === 'sale').slice(0, 4) ?? [], [data]);

  // Open repairs, most urgent first: overdue, then soonest promised day.
  const needsAttention = useMemo(
    () => (repairs.data ?? [])
      .filter(r => r.status !== 'delivered' && r.status !== 'completed')
      .sort((a, b) => Number(b.is_overdue) - Number(a.is_overdue)
        || (a.days_until_due ?? 999) - (b.days_until_due ?? 999)
        || b.days_in_shop - a.days_in_shop)
      .slice(0, 3),
    [repairs.data],
  );

  const go = (to: string, params?: object) => { setShowActions(false); navigation.navigate(to, params); };
  const firstName = user?.name?.split(' ')[0] ?? t('there');
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'am' ? 'am-ET' : 'om-ET', { weekday: 'long', day: 'numeric', month: 'long' });
  const alertCount = alerts.visible.length;
  const actions = ACTIONS_BY_ROLE[role].map(k => ACTIONS[k]);

  const dueLabel = (r: repairsApi.Repair) =>
    r.is_overdue ? t('Overdue') : r.promised_date ? t('Due {when}', { when: formatDayRelative(r.promised_date).toLowerCase() }) : t(STAGE_LABEL[r.status]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <TopLoader active={dash.fetching && !!dash.data} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={onRefresh} colors={[colors.red]} />}
      >
        <View style={styles.greetRow}>
          <View style={styles.greetText}>
            <Text style={styles.greetSub}>{today}</Text>
            <Text style={styles.greetMain} numberOfLines={1}>{t(greeting())}, {firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => setShowAlerts(true)}
            accessibilityRole="button"
            accessibilityLabel={alertCount ? t('{n} alerts', { n: alertCount }) : t('Alerts')}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {alertCount > 0 && <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>{alertCount > 9 ? '9+' : alertCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel={t('Profile and settings')}
          >
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {pendingOrders > 0 && (
          <TouchableOpacity
            style={styles.ordersBanner}
            onPress={() => navigation.navigate('Orders')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('{n} new online orders. Open orders', { n: pendingOrders })}
          >
            <Text style={styles.ordersBannerIcon}>🛍️</Text>
            <View style={styles.listBody}>
              <Text style={styles.ordersBannerTitle}>{t(pendingOrders === 1 ? tx('{n} new online order') : tx('{n} new online orders'), { n: pendingOrders })}</Text>
              <Text style={styles.ordersBannerSub}>{t('Tap to confirm and call the customer')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        {dash.loading && !data && <LoadingState variant="home" label={t('Loading your business…')} />}

        {dash.error && !data && (
          <EmptyState emoji="📡" title={t("Can't load the dashboard")} message={dash.error} actionLabel={t('Try again')} onAction={dash.reload} />
        )}

        {data && m && (
          <View>
            {dash.error && <InlineNotice message={t("Couldn't refresh. Showing saved numbers.")} onRetry={dash.reload} />}

            {/* ---------------- Owner: the whole business ---------------- */}
            {isOwner && (
              <>
                <View style={[styles.hero, shadow.md]}>
                  <View style={styles.heroAccent} />
                  <Text style={styles.heroLabel}>{t("Today's revenue")}</Text>
                  <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatBr(m.todayRevenue)}</Text>
                  <View style={styles.heroFoot}>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatLabel}>🛒 {t('From sales')}</Text>
                      <Text style={styles.heroStatValue}>{formatBr(m.salesRevenue)}</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatLabel}>🔧 {t('From repairs')}</Text>
                      <Text style={styles.heroStatValue}>{formatBr(m.repairRevenue)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.heroLink} onPress={() => navigation.navigate('Report')} accessibilityRole="button">
                    <Text style={styles.heroLinkText}>{t("View today's report")}</Text>
                    <Text style={styles.heroLinkArrow}>›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tiles}>
                  <View style={[styles.profitTile, shadow.sm, styles.tileGap]}>
                    <Text style={styles.profitLabel}>{t('Profit today')}</Text>
                    <Text style={[styles.profitValue, (m.todayProfit ?? 0) < 0 && styles.negative]} numberOfLines={1} adjustsFontSizeToFit>
                      {formatBr(m.todayProfit)}
                    </Text>
                  </View>
                  <View style={[styles.profitTile, shadow.sm]}>
                    <Text style={styles.profitLabel}>{t('Profit · 7 days')}</Text>
                    <Text style={[styles.profitValue, (m.weekProfit ?? 0) < 0 && styles.negative]} numberOfLines={1} adjustsFontSizeToFit>
                      {formatBr(m.weekProfit)}
                    </Text>
                  </View>
                </View>

                <View style={styles.tiles}>
                  <MetricCard icon="🔧" label={t('Active repairs')} value={m.activeRepairs ?? 0} style={styles.tileGap}
                    hint={(m.readyRepairs ?? 0) > 0 ? t('{n} ready', { n: m.readyRepairs ?? 0 }) : undefined} variant="green" />
                  <MetricCard icon="👥" label={t('Customers')} value={m.totalCustomers ?? 0} />
                </View>
              </>
            )}

            {/* ---------------- Sales desk: my selling today ---------------- */}
            {isSales && (
              <>
                <View style={[styles.hero, shadow.md]}>
                  <View style={styles.heroAccent} />
                  <Text style={styles.heroLabel}>{t('My sales today')}</Text>
                  <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatBr(m.todayRevenue)}</Text>
                  <View style={styles.heroFoot}>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatLabel}>{t('Sales made')}</Text>
                      <Text style={styles.heroStatValue}>{m.salesCount ?? 0}</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatLabel}>{t('Units sold')}</Text>
                      <Text style={styles.heroStatValue}>{m.unitsSold ?? 0}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tiles}>
                  <MetricCard icon="👥" label={t('Customers')} value={m.totalCustomers ?? 0} style={styles.tileGap} />
                  <MetricCard icon="📦" label={t('Low on stock')} value={m.lowStockCount ?? 0} variant={(m.lowStockCount ?? 0) > 0 ? 'amber' : 'neutral'} />
                </View>
              </>
            )}

            {/* ---------------- Technician: my jobs ---------------- */}
            {isTechnician && (
              <>
                <View style={[styles.hero, shadow.md]}>
                  <View style={styles.heroAccent} />
                  <Text style={styles.heroLabel}>{t('My open jobs')}</Text>
                  <Text style={styles.heroValue}>{m.activeRepairs ?? 0}</Text>
                  <View style={styles.heroFoot}>
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatLabel}>{t('Due soon')}</Text>
                      <Text style={styles.heroStatValue}>{m.dueSoonCount ?? 0}</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroStat}>
                      <Text style={styles.heroStatLabel}>{t('Finished today')}</Text>
                      <Text style={styles.heroStatValue}>{m.completedToday ?? 0}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tiles}>
                  <MetricCard icon="✅" label={t('Ready to collect')} value={m.readyRepairs ?? 0} variant="green" />
                </View>
              </>
            )}

            {/* Chart: owner and sales */}
            {weekly && !isTechnician && (
              <View style={[styles.card, shadow.sm]}>
                <View style={styles.cardHead}>
                  <View>
                    <Text style={styles.cardTitle}>{isOwner ? t('Revenue, last 7 days') : t('My sales, last 7 days')}</Text>
                    <Text style={styles.cardSub}>{t('{amount} in total', { amount: formatBrCompact(weekly.total) })}</Text>
                  </View>
                  {weekly.changePct !== null && (
                    <Badge label={`${weekly.changePct >= 0 ? '▲' : '▼'} ${Math.abs(weekly.changePct)}%`} variant={weekly.changePct >= 0 ? 'green' : 'red'} />
                  )}
                </View>
                <View style={styles.chart} accessibilityLabel={t('Revenue for the last seven days')}>
                  {weekly.labels.map((label, i) => {
                    const v = weekly.values[i];
                    const isToday = i === weekly.labels.length - 1;
                    return (
                      <View key={`${label}${i}`} style={styles.barCol}>
                        <Text style={[styles.barValue, isToday && styles.barValueToday]} numberOfLines={1}>
                          {v > 0 ? formatBrCompact(v).replace(' Br', '') : ''}
                        </Text>
                        <View style={styles.barSlot}>
                          <View style={[styles.bar, { height: Math.max(v > 0 ? 6 : 3, (v / maxVal) * CHART_H) }, isToday ? styles.barToday : v === 0 && styles.barEmpty]} />
                        </View>
                        <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Recent sales: owner and sales */}
            {!isTechnician && (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{isOwner ? t('Recent sales') : t('My recent sales')}</Text>
                  <TouchableOpacity onPress={() => setShowSales(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Text style={styles.sectionLink}>{t('See all')} ›</Text>
                  </TouchableOpacity>
                </View>
                {recentSales.length === 0 ? (
                  <View style={[styles.card, shadow.sm]}>
                    <Text style={styles.emptyLine}>{t('No sales yet. Make a sale from the Sell tab.')}</Text>
                  </View>
                ) : recentSales.map(item => {
                  const lines = item.description.split(', ');
                  return (
                    <View key={item.id} style={[styles.listCard, shadow.sm]}>
                      <View style={[styles.listIcon, { backgroundColor: tones.green.bg }]}><Text style={styles.listEmoji}>💳</Text></View>
                      <View style={styles.listBody}>
                        <Text style={styles.listName} numberOfLines={1}>{lines[0]}{lines.length > 1 ? ` ${t('+{n} more', { n: lines.length - 1 })}` : ''}</Text>
                        <Text style={styles.listSub} numberOfLines={1}>
                          {item.customer || t('Walk-in')} · {t(PAYMENT_LABELS[item.method ?? ''] || item.method || '')} · {timeAgo(item.time)}
                        </Text>
                      </View>
                      <Text style={styles.listAmount}>+{formatBr(item.amount)}</Text>
                    </View>
                  );
                })}
              </>
            )}

            {/* Repairs to follow up: owner and technician */}
            {!isSales && (
              <>
                <View style={[styles.sectionHead, !isTechnician && styles.sectionGap]}>
                  <Text style={styles.sectionTitle}>{isTechnician ? t('My jobs') : t('Repairs to follow up')}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Repair')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Text style={styles.sectionLink}>{t('All')} ›</Text>
                  </TouchableOpacity>
                </View>
                {needsAttention.length === 0 ? (
                  <View style={[styles.card, shadow.sm]}>
                    <Text style={styles.emptyLine}>{t('No open repairs. Nothing to follow up.')}</Text>
                  </View>
                ) : needsAttention.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.listCard, shadow.sm]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Repair')}
                  >
                    <View style={[styles.listIcon, { backgroundColor: tones.amber.bg }]}><Text style={styles.listEmoji}>🔧</Text></View>
                    <View style={styles.listBody}>
                      <Text style={styles.listName} numberOfLines={1}>{r.device_name}</Text>
                      <Text style={styles.listSub} numberOfLines={1}>{r.ticket_number} · {r.customer_name || t('No name')}</Text>
                    </View>
                    <Badge label={dueLabel(r)} variant={r.is_overdue ? 'red' : (r.days_until_due ?? 9) <= 1 ? 'amber' : 'blue'} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, shadow.md]}
        onPress={() => setShowActions(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('Quick actions')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <CenterModal visible={showActions} onClose={() => setShowActions(false)} title={t('Quick actions')}>
        {actions.map(a => (
          <TouchableOpacity key={a.title} style={styles.actionItem} activeOpacity={0.7} onPress={() => go(a.to, a.params)} accessibilityRole="button">
            <View style={[styles.actionIcon, { backgroundColor: tones[a.tone].bg }]}><Text style={styles.actionEmoji}>{a.icon}</Text></View>
            <View style={styles.listBody}>
              <Text style={styles.actionItemTitle}>{t(a.title)}</Text>
              <Text style={styles.actionItemSub}>{t(a.sub)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </CenterModal>

      <AlertsSheet
        visible={showAlerts}
        onClose={closeAlerts}
        alerts={alerts.visible}
        onIgnore={(keys) => alerts.ignore(keys)}
        onRestock={() => navigation.navigate('Stock', { filter: 'low' })}
        onOpenRepairs={() => navigation.navigate('Repair')}
        canRestock={isOwner}
      />
      <SalesHistorySheet visible={showSales} onClose={() => setShowSales(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { paddingHorizontal: layout.screenX, paddingTop: layout.topGap, paddingBottom: layout.bottomGapFab },

  ordersBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: tones.amber.bg, borderWidth: 1, borderColor: tones.amber.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  ordersBannerIcon: { fontSize: 22, marginRight: spacing.md },
  ordersBannerTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  ordersBannerSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  greetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  greetText: { flex: 1 },
  greetSub: { fontSize: 13, color: colors.text2, fontWeight: '600' },
  greetMain: { fontSize: 25, fontWeight: '900', color: colors.navy, marginTop: 2 },
  bell: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  bellIcon: { fontSize: 20 },
  bellBadge: { position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bgDeep },
  bellBadgeText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  avatarText: { color: colors.white, fontSize: 19, fontWeight: '900' },

  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.md, overflow: 'hidden' },
  heroAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: colors.red },
  heroLabel: { fontSize: 13, color: colors.onNavy, fontWeight: '700' },
  heroValue: { fontSize: 38, fontWeight: '900', color: colors.white, marginTop: 4 },
  heroFoot: { flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderColor: colors.onNavyLine },
  heroStat: { flex: 1 },
  heroStatLabel: { fontSize: 12, color: colors.onNavy, fontWeight: '700' },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: colors.white, marginTop: 3 },
  heroDivider: { width: 1, backgroundColor: colors.onNavyLine, marginHorizontal: spacing.lg },
  heroLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.onNavyLine, minHeight: 40 },
  heroLinkText: { fontSize: 14, fontWeight: '800', color: colors.white },
  heroLinkArrow: { fontSize: 22, color: colors.white, marginTop: -2 },

  tiles: { flexDirection: 'row', marginBottom: spacing.md },
  tileGap: { marginRight: spacing.md },
  profitTile: { flex: 1, backgroundColor: colors.greenSoft, borderRadius: radius.md, borderWidth: 1, borderColor: colors.greenBorder, padding: spacing.lg },
  profitLabel: { fontSize: 13, color: colors.greenDark, fontWeight: '700' },
  profitValue: { fontSize: 22, fontWeight: '900', color: colors.greenDark, marginTop: 4 },
  negative: { color: colors.redDark },

  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  cardSub: { fontSize: 13, color: colors.text2, marginTop: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center' },
  barSlot: { height: CHART_H, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '58%', maxWidth: 30, borderRadius: 6, backgroundColor: colors.navy },
  barToday: { backgroundColor: colors.red },
  barEmpty: { backgroundColor: colors.border2 },
  barValue: { fontSize: 11, fontWeight: '700', color: colors.text2, height: 16 },
  barValueToday: { color: colors.red },
  barLabel: { fontSize: 12, color: colors.text2, fontWeight: '600', marginTop: 6 },
  barLabelToday: { color: colors.red, fontWeight: '800' },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionGap: { marginTop: spacing.lg },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  sectionLink: { fontSize: 14, fontWeight: '800', color: colors.red },
  emptyLine: { fontSize: 14, color: colors.text2, textAlign: 'center', paddingVertical: spacing.sm },

  listCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, minHeight: 64,
  },
  listIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  listEmoji: { fontSize: 19 },
  listBody: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '800', color: colors.navy },
  listSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  listAmount: { fontSize: 14, fontWeight: '800', color: colors.greenDark, marginLeft: spacing.sm },

  fab: { position: 'absolute', right: layout.screenX, bottom: spacing.xl, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' },
  fabIcon: { color: colors.white, fontSize: 32, fontWeight: '300', marginTop: -3 },

  actionItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10, minHeight: 64,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionEmoji: { fontSize: 21 },
  actionItemTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  actionItemSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.text3, marginLeft: 8 },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as repairsApi from '../api/repairs';
import * as offline from '../offline/mutations';
import { overlayRepairs } from '../offline/overlays';
import { isLocalId } from '../offline/types';
import { Repair, RepairStatus, REPAIR_STAGES } from '../api/repairs';
import * as usersApi from '../api/users';
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
import { DetailRow } from '../components/DetailRow';
import { DayPicker } from '../components/DayPicker';
import { TopLoader } from '../components/TopLoader';
import { FadeInView, rowDelay } from '../components/FadeInView';
import { formatBr } from '../utils/formatCurrency';
import { addDaysYmd, formatDate, formatDay, formatDayRelative, todayYmd, toYmd } from '../utils/formatDate';
import { tr, tx, useT } from '../i18n';
import { applyReminders } from '../reminders/useReminders';
import { colors, Tone, spacing, radius, shadow, layout } from '../theme';

const STAGE_LABEL: Record<RepairStatus, string> = {
  received: tx('Received'), diagnosing: tx('Diagnosing'), fixing: tx('Fixing'), completed: tx('Ready'), delivered: tx('Delivered'),
};
const STAGE_TONE: Record<RepairStatus, Tone> = {
  received: 'blue', diagnosing: 'purple', fixing: 'amber', completed: 'green', delivered: 'neutral',
};
// What the button should say for moving a ticket out of each stage.
const NEXT_ACTION: Record<RepairStatus, string> = {
  received: tx('Start diagnosing'), diagnosing: tx('Start repair'), fixing: tx('Mark as ready'), completed: tx('Hand over to customer'), delivered: '',
};

const OPEN = 'open';
const OPEN_STAGES: RepairStatus[] = ['received', 'diagnosing', 'fixing'];
const numeric = (v: string) => v.replace(/[^0-9.]/g, '');

// "Due tomorrow", "Overdue 2d" ... for tickets still being worked on.
function dueBadge(t: Repair): { label: string; tone: Tone } | null {
  if (t.status === 'completed' || t.status === 'delivered' || !t.promised_date) return null;
  const d = t.days_until_due ?? 0;
  if (d < 0) return { label: tr('Overdue {n}d', { n: -d }), tone: 'red' };
  if (d === 0) return { label: tr('Due today'), tone: 'amber' };
  if (d === 1) return { label: tr('Due tomorrow'), tone: 'amber' };
  return { label: tr('Due {when}', { when: formatDay(t.promised_date) }), tone: 'blue' };
}

export default function RepairsScreen() {
  const tt = useT();
  const route: any = useRoute();
  const navigation: any = useNavigation();
  const { isOwner } = useRole();

  const { data, error, loading, refreshing, fetching, refresh, reload } = useResource('repairs', repairsApi.getRepairs, overlayRepairs);
  const technicians = useResource('technicians', () => (isOwner ? usersApi.getTechnicians() : Promise.resolve([])));
  const tickets = useMemo(() => data ?? [], [data]);

  // Keep the alarms on this phone in step with the jobs shown here.
  useEffect(() => { applyReminders(data); }, [data]);

  const [filter, setFilter] = useState<string>(OPEN);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  // New ticket
  const [newOpen, setNewOpen] = useState(false);
  const [device, setDevice] = useState('');
  const [issue, setIssue] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [cost, setCost] = useState('');
  const [promised, setPromised] = useState(addDaysYmd(todayYmd(), 1));
  const [errors, setErrors] = useState<{ device?: string; issue?: string }>({});
  const [creating, setCreating] = useState(false);

  // Hand-over (collect the money)
  const [handoverFor, setHandoverFor] = useState<Repair | null>(null);
  const [amount, setAmount] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>();
  const [handingOver, setHandingOver] = useState(false);

  // Change the promised day
  const [rescheduleFor, setRescheduleFor] = useState<Repair | null>(null);
  const [newPromised, setNewPromised] = useState(todayYmd());
  const [rescheduling, setRescheduling] = useState(false);

  const openNew = useCallback(() => {
    setDevice(''); setIssue(''); setCustName(''); setCustPhone(''); setCost('');
    setPromised(addDaysYmd(todayYmd(), 1)); setErrors({});
    setNewOpen(true);
  }, []);

  useEffect(() => {
    if (route.params?.openAdd) { openNew(); navigation.setParams({ openAdd: undefined }); }
  }, [route.params?.openAdd, openNew, navigation]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { [OPEN]: 0 };
    REPAIR_STAGES.forEach(s => { c[s] = 0; });
    tickets.forEach(t => { c[t.status]++; if (OPEN_STAGES.includes(t.status)) c[OPEN]++; });
    return c;
  }, [tickets]);

  const chips = [
    { key: OPEN, label: tt('Open'), count: counts[OPEN] },
    ...REPAIR_STAGES.map(s => ({ key: s, label: tt(STAGE_LABEL[s]), count: counts[s] })),
  ];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter(t => (filter === OPEN ? OPEN_STAGES.includes(t.status) : t.status === filter))
      .filter(t => !q || [t.ticket_number, t.device_name, t.customer_name, t.customer_phone, t.issue].some(f => f?.toLowerCase().includes(q)))
      // Overdue first, then the soonest promised day.
      .sort((a, b) => Number(b.is_overdue) - Number(a.is_overdue)
        || (a.days_until_due ?? 999) - (b.days_until_due ?? 999)
        || b.days_in_shop - a.days_in_shop);
  }, [tickets, filter, search]);

  const selected = selectedId == null ? null : tickets.find(t => t.id === selectedId) ?? null;

  const runAdvance = async (t: Repair, handover?: { amount_collected: number; parts_cost?: number }) => {
    setAdvancingId(t.id);
    try {
      const out = await offline.advanceRepair(t.id, handover, t.device_name);
      const next = REPAIR_STAGES[REPAIR_STAGES.indexOf(t.status) + 1];
      toast.success(offline.savedMessage(out, tt('{ticket} is now {stage}', { ticket: t.ticket_number, stage: tt(STAGE_LABEL[next]).toLowerCase() })));
      await reload();
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, tt('Could not update the ticket')));
      return false;
    } finally {
      setAdvancingId(null);
    }
  };

  const advance = (t: Repair) => {
    if (t.status === 'completed') {
      // Handing the device back is when the customer pays, so ask for the amount.
      setHandoverFor(t);
      setAmount(t.estimated_cost == null ? '' : String(t.estimated_cost));
      setPartsCost('');
      setAmountError(undefined);
    } else {
      runAdvance(t);
    }
  };

  const confirmHandover = async () => {
    if (!handoverFor) return;
    if (amount === '' || isNaN(Number(amount))) { setAmountError(tt('Enter the amount the customer paid')); return; }
    setHandingOver(true);
    const ok = await runAdvance(handoverFor, { amount_collected: Number(amount), parts_cost: partsCost ? Number(partsCost) : undefined });
    setHandingOver(false);
    if (ok) { setHandoverFor(null); setSelectedId(null); }
  };

  const validate = () => {
    const e: { device?: string; issue?: string } = {};
    if (!device.trim()) e.device = tt('Enter the device name');
    if (!issue.trim()) e.issue = tt('Describe the problem');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      const out = await offline.createRepair({
        device_name: device.trim(),
        issue: issue.trim(),
        promised_date: promised,
        customer_name: custName.trim() || undefined,
        customer_phone: custPhone.trim() || undefined,
        estimated_cost: cost ? Number(cost) : undefined,
      });
      setNewOpen(false);
      setFilter(OPEN);
      toast.success(offline.savedMessage(out, tt('Ticket {ticket} created · due {when}', { ticket: out.data.ticket_number, when: formatDayRelative(out.data.promised_date).toLowerCase() })));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, tt('Could not create the ticket')));
    } finally {
      setCreating(false);
    }
  };

  const saveReschedule = async () => {
    if (!rescheduleFor) return;
    setRescheduling(true);
    try {
      const out = await offline.updateRepair(rescheduleFor.id, { promised_date: newPromised }, rescheduleFor.device_name);
      toast.success(offline.savedMessage(out, tt('Promised day changed to {when}', { when: formatDayRelative(newPromised).toLowerCase() })));
      setRescheduleFor(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, tt('Could not change the day')));
    } finally {
      setRescheduling(false);
    }
  };

  const assign = async (t: Repair, technicianId: number | null) => {
    try {
      const techName = technicianId ? technicians.data?.find(x => x.id === technicianId)?.name : undefined;
      const out = await offline.assignRepair(t.id, technicianId, techName, t.device_name);
      toast.success(offline.savedMessage(out, technicianId ? tt('Job assigned') : tt('Job moved back to the queue')));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, tt('Could not assign the job')));
    }
  };

  const call = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => toast.error(tt('Could not open the phone app')));
  };

  // Opens the messages app with a note for the customer, ready to send.
  const messageCustomer = (r: Repair) => {
    if (!r.customer_phone) return;
    const text = r.promised_date
      ? tt('Hello {name}, your {device} will be ready on {day}. Chala Mobile', { name: r.customer_name || '', device: r.device_name, day: formatDay(r.promised_date) })
      : tt('Hello {name}, we are working on your {device}. Chala Mobile', { name: r.customer_name || '', device: r.device_name });
    Linking.openURL(`sms:${r.customer_phone.replace(/\s+/g, '')}?body=${encodeURIComponent(text.replace('Hello ,', 'Hello,'))}`)
      .catch(() => toast.error(tt('Could not open the phone app')));
  };

  const handoverProfit = amount !== '' && !isNaN(Number(amount)) ? Number(amount) - (partsCost ? Number(partsCost) : 0) : null;

  const renderItem = ({ item, index }: { item: Repair; index: number }) => {
    const due = dueBadge(item);
    return (
      <FadeInView delay={rowDelay(index)}>
      <TouchableOpacity style={[styles.card, shadow.sm, item.is_overdue && styles.cardOverdue]} activeOpacity={0.8} onPress={() => setSelectedId(item.id)} accessibilityRole="button">
        <View style={styles.cardTop}>
          <View style={styles.cardBody}>
            <Text style={styles.ticketNum}>{isLocalId(item.id) ? tt('New') : item.ticket_number}  ·  {tt('Received {when}', { when: formatDayRelative(toYmd(new Date(item.received_at))).toLowerCase() })}</Text>
            <Text style={styles.deviceName} numberOfLines={1}>{item.device_name}</Text>
            <Text style={styles.issue} numberOfLines={2}>{item.issue}</Text>
          </View>
          <View style={styles.cardEnd}>
            <Badge label={tt(STAGE_LABEL[item.status])} variant={STAGE_TONE[item.status]} />
            {isLocalId(item.id) ? <PendingBadge style={styles.dueBadge} /> : due && <Badge label={due.label} variant={due.tone} style={styles.dueBadge} />}
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.cardWho}>
            <Text style={styles.customer} numberOfLines={1}>👤 {item.customer_name || tt('No name')}</Text>
            <Text style={styles.tech} numberOfLines={1}>{item.technician_name ? `🛠 ${item.technician_name}` : tt('Unassigned')}</Text>
          </View>
          {item.status !== 'delivered' && (
            <Button
              title={tt(NEXT_ACTION[item.status])}
              size="sm"
              variant={item.status === 'completed' ? 'dark' : 'primary'}
              loading={advancingId === item.id}
              onPress={() => advance(item)}
            />
          )}
        </View>
      </TouchableOpacity>
      </FadeInView>
    );
  };

  const emptyList = loading && !data ? (
    <LoadingState label={tt('Loading repairs…')} />
  ) : error && !data ? (
    <EmptyState emoji="📡" title={tt("Can't load repairs")} message={error} actionLabel={tt('Try again')} onAction={reload} />
  ) : tickets.length === 0 ? (
    <EmptyState emoji="🔧" title={tt('No repair tickets')} message={tt('Register a device to start tracking its repair.')} actionLabel={tt('New ticket')} onAction={openNew} />
  ) : (
    <EmptyState
      emoji={filter === OPEN ? '🎉' : '🔧'}
      title={search ? tt('No matches') : filter === OPEN ? tt('No open repairs') : tt('Nothing {stage}', { stage: tt(STAGE_LABEL[filter as RepairStatus] ?? '').toLowerCase() })}
      message={search ? tt('Try a different search.') : undefined}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <ScreenHeader
        title={tt('Repairs')}
        subtitle={data ? tt('{open} open · {ready} ready to collect', { open: counts[OPEN], ready: counts.completed }) : undefined}
        right={<Button title={tt('+ Ticket')} size="sm" onPress={openNew} />}
      />
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={tt('Search ticket, device or customer')} />
      </View>
      <ChipRow items={chips} selected={filter} onSelect={setFilter} />
      <TopLoader active={fetching && !!data} />

      <FlatList
        data={visible}
        keyExtractor={t => String(t.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} />}
        ListHeaderComponent={error && data ? <InlineNotice message={tt("Couldn't refresh. Showing saved tickets.")} onRetry={reload} /> : undefined}
        ListEmptyComponent={emptyList}
      />

      {/* Detail */}
      <CenterModal
        visible={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.ticket_number}
        footer={selected ? (
          <View>
            {selected.customer_phone ? (
              <>
                <Button title={tt('Call {name}', { name: selected.customer_name || tt('customer') })} icon="📞" variant="secondary" onPress={() => call(selected.customer_phone!)} style={styles.footGap} />
                {selected.status !== 'delivered' && (
                  <Button title={tt('Message the customer')} icon="💬" variant="secondary" onPress={() => messageCustomer(selected)} style={styles.footGap} />
                )}
              </>
            ) : null}
            {selected.status !== 'delivered' && (
              <Button
                title={tt(NEXT_ACTION[selected.status])}
                onPress={() => advance(selected)}
                loading={advancingId === selected.id}
                variant={selected.status === 'completed' ? 'dark' : 'primary'}
              />
            )}
          </View>
        ) : undefined}
      >
        {selected && (
          <View>
            <Text style={styles.detailDevice}>{selected.device_name}</Text>
            <Text style={styles.detailIssue}>{selected.issue}</Text>

            <View style={styles.timeline}>
              {REPAIR_STAGES.map((s, i) => {
                const finished = selected.status === 'delivered';
                const done = i + 1 < selected.status_step || (finished && i + 1 === selected.status_step);
                const current = !finished && i + 1 === selected.status_step;
                const when = s === 'received' ? selected.received_at : s === 'completed' ? selected.completed_at : s === 'delivered' ? selected.delivered_at : null;
                return (
                  <View key={s} style={styles.step}>
                    <View style={styles.stepRail}>
                      <View style={[styles.stepDot, (done || current) && styles.stepDotOn, current && styles.stepDotCurrent]}>
                        {done && <Text style={styles.stepCheck}>✓</Text>}
                      </View>
                      {i < REPAIR_STAGES.length - 1 && <View style={[styles.stepLine, done && styles.stepLineOn]} />}
                    </View>
                    <View style={styles.stepBody}>
                      <Text style={[styles.stepLabel, current && styles.stepLabelCurrent, !done && !current && styles.stepLabelIdle]}>{tt(STAGE_LABEL[s])}</Text>
                      {when && (done || current) ? <Text style={styles.stepDate}>{formatDate(when)}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.detailBox}>
              <DetailRow label={tt('Customer')} value={selected.customer_name} />
              <DetailRow label={tt('Phone')} value={selected.customer_phone} />
              <DetailRow label={tt('Received')} value={formatDate(selected.received_at)} />
              <DetailRow
                label={tt('Promised back')}
                value={selected.promised_date ? `${formatDayRelative(selected.promised_date)} · ${formatDay(selected.promised_date)}` : tt('No day set')}
              />
              <DetailRow label={tt('Estimated cost')} value={selected.estimated_cost == null ? null : formatBr(selected.estimated_cost)} />
              {selected.actual_cost != null && <DetailRow label={tt('Paid by customer')} value={formatBr(selected.actual_cost)} />}
              <DetailRow label={tt('Technician')} value={selected.technician_name || tt('Unassigned')} last />
            </View>

            {selected.status !== 'delivered' && (
              <Button
                title={tt('Change promised day')}
                variant="secondary"
                size="sm"
                onPress={() => { setNewPromised(selected.promised_date && selected.promised_date >= todayYmd() ? selected.promised_date : todayYmd()); setRescheduleFor(selected); }}
                style={styles.changeBtn}
              />
            )}

            {isOwner && selected.status !== 'delivered' && (technicians.data?.length ?? 0) > 0 && (
              <View style={styles.assign}>
                <Text style={styles.assignLabel}>{tt('ASSIGN TO')}</Text>
                <ChipRow
                  variant="form"
                  items={[{ key: 'none', label: tt('Unassigned') }, ...(technicians.data ?? []).map(t => ({ key: String(t.id), label: t.name }))]}
                  selected={selected.technician_id ? String(selected.technician_id) : 'none'}
                  onSelect={(k) => assign(selected, k === 'none' ? null : Number(k))}
                />
              </View>
            )}
          </View>
        )}
      </CenterModal>

      {/* New ticket */}
      <FormModal
        visible={newOpen}
        onClose={() => setNewOpen(false)}
        title={tt('New repair ticket')}
        subtitle={tt('Register a device that was brought in')}
        footer={<Button title={tt('Create ticket')} onPress={create} loading={creating} />}
      >
        <View style={styles.receivedBox}>
          <Text style={styles.receivedLabel}>{tt('RECEIVED')}</Text>
          <Text style={styles.receivedValue}>{formatDayRelative(todayYmd())} · {formatDay(todayYmd())}</Text>
          <Text style={styles.receivedHint}>{tt('Saved automatically')}</Text>
        </View>

        <FormInput label={tt('Device *')} value={device} onChangeText={v => { setDevice(v); setErrors(e => ({ ...e, device: undefined })); }} placeholder={tt('e.g. Samsung A15')} error={errors.device} />
        <FormInput label={tt('Problem *')} value={issue} onChangeText={v => { setIssue(v); setErrors(e => ({ ...e, issue: undefined })); }} placeholder={tt('e.g. Screen cracked, not charging…')} multiline error={errors.issue} />

        <DayPicker label={tt('Promised back on *')} value={promised} onChange={setPromised} hint={tt("You'll get a reminder the day before.")} />

        <FormInput label={tt('Customer name')} value={custName} onChangeText={setCustName} placeholder="Ahmed Musa" autoCapitalize="words" />
        <FormInput label={tt('Customer phone')} value={custPhone} onChangeText={setCustPhone} placeholder="0911 234 567" keyboardType="phone-pad" />
        <FormInput label={tt('Estimated cost (Br)')} value={cost} onChangeText={v => setCost(numeric(v))} placeholder="2500" keyboardType="numeric" />
      </FormModal>

      {/* Hand over: collect the money */}
      <FormModal
        visible={!!handoverFor}
        onClose={() => setHandoverFor(null)}
        title={tt('Hand over device')}
        subtitle={handoverFor ? `${handoverFor.device_name} · ${handoverFor.customer_name || tt('customer')}` : undefined}
        footer={<Button title={tt('Confirm hand-over')} variant="dark" onPress={confirmHandover} loading={handingOver} />}
      >
        <FormInput
          label={tt('Amount collected (Br) *')} value={amount} onChangeText={v => { setAmount(numeric(v)); setAmountError(undefined); }}
          keyboardType="numeric" placeholder="2500" error={amountError}
          helperText={handoverFor?.estimated_cost != null ? tt('The estimate was {amount}.', { amount: formatBr(handoverFor.estimated_cost) }) : undefined}
        />
        <FormInput
          label={tt('Parts cost (Br)')} value={partsCost} onChangeText={v => setPartsCost(numeric(v))} keyboardType="numeric" placeholder={tt('Optional')}
          helperText={tt('What you spent on parts, so repair profit is right.')}
        />
        {handoverProfit !== null && (
          <View style={styles.profitBox}>
            <Text style={styles.profitLabel}>{tt('Repair profit')}</Text>
            <Text style={[styles.profitValue, handoverProfit < 0 && { color: colors.redDark }]}>{formatBr(handoverProfit)}</Text>
          </View>
        )}
      </FormModal>

      {/* Change the promised day */}
      <FormModal
        visible={!!rescheduleFor}
        onClose={() => setRescheduleFor(null)}
        title={tt('Change promised day')}
        subtitle={rescheduleFor ? `${rescheduleFor.device_name} · ${rescheduleFor.ticket_number}` : undefined}
        footer={<Button title={tt('Save new day')} onPress={saveReschedule} loading={rescheduling} />}
      >
        <DayPicker label={tt('Promised back on')} value={newPromised} onChange={setNewPromised} />
      </FormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  searchWrap: { paddingHorizontal: layout.screenX, paddingBottom: spacing.md, backgroundColor: colors.white },
  listContent: { paddingHorizontal: layout.screenX, paddingTop: spacing.lg, paddingBottom: layout.bottomGap, flexGrow: 1 },

  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden' },
  cardOverdue: { borderColor: colors.redBorder },
  cardTop: { flexDirection: 'row', padding: spacing.lg, paddingBottom: spacing.md },
  cardBody: { flex: 1, marginRight: spacing.sm },
  cardEnd: { alignItems: 'flex-end' },
  dueBadge: { marginTop: 6 },
  ticketNum: { fontSize: 12, fontWeight: '700', color: colors.text3 },
  deviceName: { fontSize: 16, fontWeight: '900', color: colors.navy, marginTop: 3 },
  issue: { fontSize: 13, color: colors.text2, marginTop: 3, lineHeight: 18 },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard2,
  },
  cardWho: { flex: 1, marginRight: spacing.md },
  customer: { fontSize: 13, color: colors.navy, fontWeight: '700' },
  tech: { fontSize: 12, color: colors.text2, marginTop: 2 },

  footGap: { marginBottom: spacing.sm },
  detailDevice: { fontSize: 20, fontWeight: '900', color: colors.navy },
  detailIssue: { fontSize: 14, color: colors.text2, marginTop: 4, marginBottom: spacing.lg, lineHeight: 20 },
  timeline: { marginBottom: spacing.lg },
  step: { flexDirection: 'row', minHeight: 44 },
  stepRail: { width: 28, alignItems: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  stepDotOn: { backgroundColor: colors.green },
  stepDotCurrent: { backgroundColor: colors.red, borderWidth: 4, borderColor: colors.redBorder },
  stepCheck: { color: colors.white, fontSize: 12, fontWeight: '900' },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.border2, marginVertical: 2 },
  stepLineOn: { backgroundColor: colors.green },
  stepBody: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.md },
  stepLabel: { fontSize: 15, fontWeight: '700', color: colors.navy },
  stepLabelCurrent: { fontWeight: '900', color: colors.red },
  stepLabelIdle: { color: colors.text3, fontWeight: '600' },
  stepDate: { fontSize: 12, color: colors.text2, marginTop: 1 },
  detailBox: { backgroundColor: colors.bgCard2, borderRadius: radius.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  changeBtn: { alignSelf: 'flex-start', marginBottom: spacing.md },
  assign: { marginBottom: spacing.sm },
  assignLabel: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginBottom: 6 },

  receivedBox: { backgroundColor: colors.bgCard2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  receivedLabel: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6 },
  receivedValue: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: 4 },
  receivedHint: { fontSize: 12, color: colors.text3, marginTop: 2 },

  profitBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.greenSoft, borderColor: colors.greenBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  profitLabel: { fontSize: 14, fontWeight: '700', color: colors.greenDark },
  profitValue: { fontSize: 20, fontWeight: '900', color: colors.greenDark },
});

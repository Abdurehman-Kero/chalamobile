import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as usersApi from '../api/users';
import { TeamMember, ROLE_LABEL } from '../api/users';
import { Role } from '../api/auth';
import { getErrorMessage } from '../api/errors';
import { useResource } from '../hooks/useResource';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { OfflineBanner } from '../components/OfflineBanner';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { ChipRow } from '../components/ChipRow';
import { TopLoader } from '../components/TopLoader';
import { FadeInView, rowDelay } from '../components/FadeInView';
import { colors, avatarColors, Tone, spacing, radius, shadow, layout } from '../theme';

const ROLES: { key: Role; label: string; blurb: string; tone: Tone }[] = [
  { key: 'sales', label: 'Sales', blurb: 'Sells products and manages clients. Cannot see costs, profit or repairs.', tone: 'blue' },
  { key: 'technician', label: 'Technician', blurb: 'Works on repair jobs only. Sees nothing about sales or stock.', tone: 'amber' },
  { key: 'owner', label: 'Admin', blurb: 'Sees and manages everything, including the team.', tone: 'red' },
];
const roleTone = (r: Role): Tone => ROLES.find(x => x.key === r)?.tone ?? 'neutral';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamScreen() {
  const navigation: any = useNavigation();
  const me = useAuthStore(s => s.user);

  const { data, error, loading, refreshing, fetching, refresh, reload } = useResource('team', usersApi.getUsers);
  const members = useMemo(() => data ?? [], [data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('sales');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null); setName(''); setEmail(''); setPassword(''); setRole('sales'); setErrors({});
    setFormOpen(true);
  };
  const openEdit = (m: TeamMember) => {
    setEditing(m); setName(m.name); setEmail(m.email); setPassword(''); setRole(m.role); setErrors({});
    setFormOpen(true);
  };

  const save = async () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Enter the person’s name';
    if (!editing && !EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address';
    if ((!editing || password) && password.length < 6) e.password = 'Use at least 6 characters';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      if (editing) {
        await usersApi.updateUser(editing.id, { name: name.trim(), role, ...(password ? { password } : {}) });
      } else {
        await usersApi.createUser({ name: name.trim(), email: email.trim(), password, role });
      }
      setFormOpen(false);
      toast.success(editing ? 'Changes saved' : `${name.trim()} can now sign in`);
      reload();
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Could not save');
      if (err?.response?.data?.code === 'DUPLICATE_EMAIL') setErrors({ email: msg });
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (m: TeamMember, active: boolean) => {
    try {
      await usersApi.updateUser(m.id, { is_active: active });
      toast.success(active ? `${m.name} can sign in again` : `${m.name} can no longer sign in`);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the account'));
    }
  };

  const renderItem = ({ item, index }: { item: TeamMember; index: number }) => {
    const isMe = item.id === me?.id;
    return (
      <FadeInView delay={rowDelay(index)}>
      <TouchableOpacity
        style={[styles.card, shadow.sm, !item.is_active && styles.cardOff]}
        onPress={() => openEdit(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${ROLE_LABEL[item.role]}${item.is_active ? '' : ', disabled'}`}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColors[index % avatarColors.length] }]}>
          <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {isMe && <Text style={styles.you}> (you)</Text>}
          </View>
          <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
          <Badge label={item.is_active ? ROLE_LABEL[item.role] : 'Disabled'} variant={item.is_active ? roleTone(item.role) : 'neutral'} style={styles.badge} />
        </View>
        {!isMe && (
          <Switch
            value={item.is_active}
            onValueChange={(v) => setActive(item, v)}
            trackColor={{ false: colors.border2, true: colors.green }}
            thumbColor={colors.white}
            accessibilityLabel={`${item.name} can sign in`}
          />
        )}
      </TouchableOpacity>
      </FadeInView>
    );
  };

  const emptyList = loading && !data ? <LoadingState label="Loading team…" />
    : error && !data ? <EmptyState emoji="📡" title="Can't load the team" message={error} actionLabel="Try again" onAction={reload} />
    : <EmptyState emoji="👥" title="No team members" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <OfflineBanner />
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.titles}>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.sub}>{members.filter(m => m.is_active).length} people can sign in</Text>
        </View>
        <Button title="+ Add" size="sm" onPress={openAdd} />
      </View>

      <TopLoader active={fetching && !!data} />

      <FlatList
        data={members}
        keyExtractor={m => String(m.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} />}
        ListHeaderComponent={error && data ? <InlineNotice message="Couldn't refresh. Showing the saved team." onRetry={reload} /> : undefined}
        ListEmptyComponent={emptyList}
      />

      <FormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit team member' : 'Add team member'}
        subtitle={editing ? editing.email : 'They sign in with this email and password'}
        footer={<Button title={editing ? 'Save changes' : 'Create account'} onPress={save} loading={saving} />}
      >
        <FormInput label="Full name *" value={name} onChangeText={v => { setName(v); setErrors(x => ({ ...x, name: undefined })); }} placeholder="e.g. Chala" autoCapitalize="words" error={errors.name} />
        {!editing && (
          <FormInput
            label="Email *" value={email} onChangeText={v => { setEmail(v); setErrors(x => ({ ...x, email: undefined })); }}
            placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email}
          />
        )}
        <FormInput
          label={editing ? 'New password (leave empty to keep)' : 'Password *'}
          value={password} onChangeText={v => { setPassword(v); setErrors(x => ({ ...x, password: undefined })); }}
          placeholder="At least 6 characters" isPassword autoCapitalize="none" error={errors.password}
          helperText={editing ? 'Fill this in only to reset their password.' : 'Tell them this password so they can sign in.'}
        />

        <Text style={styles.roleLabel}>ROLE</Text>
        <ChipRow
          variant="form"
          items={ROLES.map(r => ({ key: r.key, label: r.label }))}
          selected={role}
          onSelect={(k) => setRole(k as Role)}
        />
        <Text style={styles.roleBlurb}>{ROLES.find(r => r.key === role)?.blurb}</Text>
      </FormModal>
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
  list: { paddingHorizontal: layout.screenX, paddingTop: spacing.lg, paddingBottom: layout.bottomGap, flexGrow: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md, minHeight: 76,
  },
  cardOff: { opacity: 0.6 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  body: { flex: 1, marginRight: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  you: { fontSize: 13, color: colors.text3, fontWeight: '600' },
  email: { fontSize: 12, color: colors.text2, marginTop: 2 },
  badge: { marginTop: 6 },
  roleLabel: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginBottom: 6 },
  roleBlurb: { fontSize: 13, color: colors.text2, lineHeight: 19, marginBottom: spacing.lg },
});

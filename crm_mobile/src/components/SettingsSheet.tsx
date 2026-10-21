import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CenterModal } from './CenterModal';
import { Button } from './Button';
import { ServerSettingsSheet } from './ServerSettingsSheet';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useOutboxCounts } from '../offline/engine';
import { getApiBaseUrl } from '../api/axios';
import { colors, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = { owner: 'Admin', technician: 'Technician', sales: 'Sales' };

export const SettingsSheet: React.FC<Props> = ({ visible, onClose }) => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigation: any = useNavigation();
  const { pending, failed } = useOutboxCounts();
  const [serverOpen, setServerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const confirmLogout = () => {
    const waiting = pending + failed;
    const note = waiting > 0
      ? `

${waiting} ${waiting === 1 ? 'change has' : 'changes have'} not reached the server yet. They stay on this phone and are sent the next time you sign in.`
      : '';
    Alert.alert('Sign out?', `You will need to sign in again to use the app.${note}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { onClose(); logout(); } },
    ]);
  };

  return (
    <>
      <CenterModal visible={visible} onClose={onClose} title="Account">
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <View style={styles.role}><Text style={styles.roleText}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</Text></View>
        </View>

        {user?.role === 'owner' && (
          <TouchableOpacity
            style={[styles.row, styles.rowGap]}
            activeOpacity={0.7}
            onPress={() => { onClose(); navigation.navigate('Team'); }}
            accessibilityRole="button"
          >
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>Team</Text>
              <Text style={styles.rowSub}>Add admins, sales and technicians</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => { setServerUrl(getApiBaseUrl()); setServerOpen(true); }}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Server connection</Text>
            <Text style={styles.rowSub} numberOfLines={1}>{serverUrl}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Button title="Sign out" variant="danger" onPress={confirmLogout} style={{ marginTop: spacing.lg }} />
        <Text style={styles.version}>ChalaMob CRM · v1.0.0</Text>
      </CenterModal>

      <ServerSettingsSheet
        visible={serverOpen}
        onClose={() => setServerOpen(false)}
        onSaved={setServerUrl}
      />
    </>
  );
};

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  name: { fontSize: 17, fontWeight: '800', color: colors.navy },
  email: { fontSize: 13, color: colors.text2, marginTop: 2 },
  role: { backgroundColor: colors.bgCard2, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  roleText: { fontSize: 12, fontWeight: '700', color: colors.text2 },
  flex: { flex: 1 },
  rowGap: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, minHeight: 56,
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  rowSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.text3, marginLeft: 8 },
  version: { textAlign: 'center', fontSize: 12, color: colors.text3, marginTop: spacing.lg },
});

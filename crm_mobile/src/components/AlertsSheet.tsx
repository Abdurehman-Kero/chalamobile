import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CenterModal } from './CenterModal';
import { Button } from './Button';
import { Alert } from '../api/alerts';
import { colors, tones, radius, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  alerts: Alert[];
  // "Ignore" hides these alerts until tomorrow.
  onIgnore: (keys: string[]) => void;
  onRestock: () => void;       // go to the low-stock list
  onOpenRepairs: () => void;   // go to the repairs list
  canRestock: boolean;         // owner: restock; sales: only look at stock
}

import { useT, tx } from '../i18n';

const SHOWN = 4;

// What needs attention right now. Each group can be acted on or ignored for today.
export const AlertsSheet: React.FC<Props> = ({ visible, onClose, alerts, onIgnore, onRestock, onOpenRepairs, canRestock }) => {
  const t = useT();
  // The server words these in English, so they are matched here and written in the chosen language.
  const detail = (text: string) => {
    const left = /^Only (\d+) left$/.exec(text);
    if (left) return t('Only {n} left', { n: left[1] });
    const late = /^Overdue by (\d+) days?$/.exec(text);
    if (late) return t(late[1] === '1' ? tx('Overdue by {n} day') : tx('Overdue by {n} days'), { n: late[1] });
    return t(text);
  };
  const stock = alerts.filter(a => a.type === 'low_stock');
  const repairs = alerts.filter(a => a.type === 'repair_due');

  return (
    <CenterModal visible={visible} onClose={onClose} title={alerts.length ? t('Needs your attention') : t('All clear')}>
      {alerts.length === 0 && (
        <View style={styles.clear}>
          <Text style={styles.clearEmoji}>✅</Text>
          <Text style={styles.clearText}>{t('Nothing needs attention right now.')}</Text>
        </View>
      )}

      {repairs.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>⏰ {t('Repairs due')} ({repairs.length})</Text>
          {repairs.slice(0, SHOWN).map(a => (
            <View key={a.key} style={styles.item}>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>{a.ticket_number} · {a.customer_name || t('No name')}</Text>
              </View>
              <Text style={[styles.when, a.severity === 'danger' && styles.whenDanger]}>{detail(a.detail)}</Text>
            </View>
          ))}
          {repairs.length > SHOWN && <Text style={styles.more}>{t('+{n} more', { n: repairs.length - SHOWN })}</Text>}
          <View style={styles.actions}>
            <Button title={t('Ignore today')} variant="secondary" size="sm" onPress={() => onIgnore(repairs.map(r => r.key))} style={styles.action} />
            <Button title={t('Open repairs')} size="sm" onPress={() => { onClose(); onOpenRepairs(); }} style={styles.action} />
          </View>
        </View>
      )}

      {stock.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>📦 {t('Running low')} ({stock.length})</Text>
          {stock.slice(0, SHOWN).map(a => (
            <View key={a.key} style={styles.item}>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>{a.emoji} {a.title}</Text>
              </View>
              <Text style={[styles.when, a.severity === 'danger' && styles.whenDanger]}>{detail(a.detail)}</Text>
            </View>
          ))}
          {stock.length > SHOWN && <Text style={styles.more}>{t('+{n} more', { n: stock.length - SHOWN })}</Text>}
          <View style={styles.actions}>
            <Button title={t('Ignore today')} variant="secondary" size="sm" onPress={() => onIgnore(stock.map(s => s.key))} style={styles.action} />
            <Button title={canRestock ? t('Restock') : t('View stock')} size="sm" onPress={() => { onClose(); onRestock(); }} style={styles.action} />
          </View>
        </View>
      )}
    </CenterModal>
  );
};

const styles = StyleSheet.create({
  group: { backgroundColor: tones.amber.bg, borderColor: tones.amber.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  groupTitle: { fontSize: 15, fontWeight: '900', color: colors.navy, marginBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  itemBody: { flex: 1, marginRight: spacing.sm },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  itemMeta: { fontSize: 12, color: colors.text2, marginTop: 1 },
  when: { fontSize: 13, fontWeight: '800', color: colors.amberDark },
  whenDanger: { color: colors.redDark },
  more: { fontSize: 13, color: colors.text2, fontWeight: '600', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: spacing.md },
  action: { flex: 1, marginRight: spacing.sm },
  clear: { alignItems: 'center', paddingVertical: spacing.xl },
  clearEmoji: { fontSize: 38 },
  clearText: { fontSize: 15, color: colors.text2, marginTop: spacing.sm },
});

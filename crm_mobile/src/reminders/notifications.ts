import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AlarmType, AndroidCategory, AndroidImportance, AndroidNotificationSetting, AndroidStyle, AuthorizationStatus, TriggerType,
} from '@notifee/react-native';
import { Repair } from '../api/repairs';
import { Role } from '../api/auth';
import { tr, useLang } from '../i18n';
import { formatDay } from '../utils/formatDate';
import { Reminder, ReminderKind, planReminders } from './plan';

const OLD_CHANNELS = ['repair-alarms-v1'];
const ENABLED_KEY = 'repair_reminders_enabled';
const PREFIX = 'repair-';
// The alarm rings until it is tapped or dismissed, and stops by itself after a minute.
const RING_MS = 60_000;

export const remindersSupported = Platform.OS === 'android';

export async function remindersEnabled(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'off'; } catch { return true; }
}

export async function setRemindersEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, on ? 'on' : 'off').catch(() => {});
  if (!on) await cancelAll();
}

/**
 * The alarm voice is a recording (res/raw/alarm_<kind>_<language>.mp3): a chime, then a voice saying that the
 * repair time is almost here. Android fixes the sound when a channel is created, so each kind and language
 * has its own channel, and the one for the chosen language is used.
 */
const soundName = (kind: ReminderKind, lang: string) => `alarm_${kind}_${lang}`;

async function ensureChannel(kind: ReminderKind): Promise<string> {
  const lang = useLang.getState().lang;
  OLD_CHANNELS.forEach(id => { notifee.deleteChannel(id).catch(() => {}); });
  return notifee.createChannel({
    id: `repair-${kind}-${lang}-v2`,
    name: `${tr('Repair alarms')} (${lang.toUpperCase()}, ${kind})`,
    description: tr('Rings the day before a customer comes for a repair'),
    importance: AndroidImportance.HIGH,
    sound: soundName(kind, lang),
    vibration: true,
    vibrationPattern: [400, 600, 400, 600, 400, 600],
    lights: true,
    bypassDnd: false,
  });
}

export interface ReminderStatus {
  allowed: boolean;     // notifications may be shown at all
  exactAlarms: boolean; // alarms may ring at the exact minute
}

export async function reminderStatus(): Promise<ReminderStatus> {
  if (!remindersSupported) return { allowed: false, exactAlarms: false };
  const s = await notifee.getNotificationSettings();
  return {
    allowed: s.authorizationStatus === AuthorizationStatus.AUTHORIZED,
    exactAlarms: s.android.alarm === AndroidNotificationSetting.ENABLED,
  };
}

/** Asks for permission to show notifications (Android 13 and later ask the person once). */
export async function askPermission(): Promise<ReminderStatus> {
  if (!remindersSupported) return { allowed: false, exactAlarms: false };
  await notifee.requestPermission();
  return reminderStatus();
}

/** Opens the system page where the person lets the app ring at exact times. */
export const openExactAlarmSettings = () => notifee.openAlarmPermissionSettings();

function words(r: Repair, kind: Reminder['kind']): { title: string; body: string } {
  const who = r.customer_name ? ` · ${r.customer_name}` : '';
  const job = `${r.device_name}${who}`;
  const stage = r.status === 'fixing' ? tr('It is being fixed now.') : tr('It is not finished yet.');
  if (kind === 'before') {
    return {
      title: `⏰ ${tr('Repair due tomorrow')}`,
      body: `${job}\n${tr('The customer comes for it tomorrow ({day}).', { day: formatDay(r.promised_date) })} ${stage} ${tr('Finish it today so it is ready.')}`,
    };
  }
  if (kind === 'today') {
    return {
      title: `🔔 ${tr('Repair due today')}`,
      body: `${job}\n${tr('The customer comes for it today.')} ${stage}`,
    };
  }
  return {
    title: `⚠️ ${tr('Repair is late')}`,
    body: `${job}\n${tr('It was promised for {day} and is not ready.', { day: formatDay(r.promised_date) })}`,
  };
}

async function schedule(reminder: Reminder, repair: Repair, exact: boolean) {
  const channelId = await ensureChannel(reminder.kind);
  const { title, body } = words(repair, reminder.kind);
  await notifee.createTriggerNotification(
    {
      id: reminder.id,
      title,
      body,
      data: { repairId: String(reminder.repairId) },
      android: {
        channelId,
        smallIcon: 'ic_notification',
        color: '#E8231A',
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        sound: soundName(reminder.kind, useLang.getState().lang),
        loopSound: true,
        vibrationPattern: [400, 600, 400, 600, 400, 600],
        timeoutAfter: RING_MS,
        autoCancel: true,
        style: { type: AndroidStyle.BIGTEXT, text: body },
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: reminder.at,
      ...(exact ? { alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE } } : {}),
    },
  );
}

/**
 * Makes the alarms on this phone match the repairs: adds the new ones, moves the changed ones and
 * removes those of jobs that are finished, handed over, or no longer this person's.
 * It runs on the phone itself, so it works without a connection.
 */
export async function syncReminders(repairs: Repair[], role: Role, userId: number): Promise<number> {
  if (!remindersSupported) return 0;
  try {
    if (!(await remindersEnabled())) return 0;
    const status = await reminderStatus();
    if (!status.allowed) return 0;

    const plan = planReminders(repairs, role, userId);
    const byId = new Map(repairs.map(r => [r.id, r]));
    const existing = (await notifee.getTriggerNotificationIds()).filter(id => id.startsWith(PREFIX));
    const wanted = new Set(plan.map(p => p.id));
    const stale = existing.filter(id => !wanted.has(id));
    if (stale.length) await notifee.cancelTriggerNotifications(stale);

    for (const p of plan) {
      const repair = byId.get(p.repairId);
      if (repair) await schedule(p, repair, status.exactAlarms);
    }
    return plan.length;
  } catch {
    return 0;
  }
}

export async function cancelAll(): Promise<void> {
  if (!remindersSupported) return;
  try {
    const ids = (await notifee.getTriggerNotificationIds()).filter(id => id.startsWith(PREFIX));
    if (ids.length) await notifee.cancelTriggerNotifications(ids);
    await notifee.cancelDisplayedNotifications(ids);
  } catch { /* nothing scheduled */ }
}

/** Rings in a few seconds, so the person can hear and see exactly what the real alarm does. */
export async function sendTestAlarm(): Promise<void> {
  const channelId = await ensureChannel('before');
  await notifee.createTriggerNotification(
    {
      id: 'test-alarm',
      title: `⏰ ${tr('Repair due tomorrow')}`,
      body: tr('This is a test. A real alarm looks and sounds like this.'),
      android: {
        channelId,
        smallIcon: 'ic_notification',
        color: '#E8231A',
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        sound: soundName('before', useLang.getState().lang),
        loopSound: true,
        vibrationPattern: [400, 600, 400, 600, 400, 600],
        timeoutAfter: RING_MS,
        autoCancel: true,
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    },
    { type: TriggerType.TIMESTAMP, timestamp: Date.now() + 5000 },
  );
}

export { notifee };

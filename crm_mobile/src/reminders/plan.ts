import { Repair } from '../api/repairs';
import { Role } from '../api/auth';
import { fromYmd, addDaysYmd } from '../utils/formatDate';

// When the alarms ring. The day before the customer comes, so there is a whole working day to finish.
export const DAY_BEFORE_HOUR = 9;
export const DUE_DAY_HOUR = 8;
export const LATE_HOUR = 9;

export type ReminderKind = 'before' | 'today' | 'late';

export interface Reminder {
  id: string;          // stable, so planning again replaces the same alarm instead of adding another
  repairId: number;
  kind: ReminderKind;
  at: number;          // when it rings (ms since 1970)
}

const atHour = (ymd: string, hour: number) => {
  const d = fromYmd(ymd);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

const toYmdLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Repairs this person is responsible for: a technician their own jobs, the owner every job. */
export function mineToRemind(repairs: Repair[], role: Role, userId: number): Repair[] {
  if (role === 'sales') return [];
  return repairs.filter(r =>
    r.status !== 'completed' && r.status !== 'delivered' && !!r.promised_date &&
    (role === 'owner' || r.technician_id === userId));
}

/**
 * The alarms that should exist right now:
 *  - the day before the promised day, 9:00;
 *  - the promised day itself, 8:00;
 *  - for a job already late, the next 9:00 (planned again each time the app opens).
 * Anything whose time has passed is left out, so opening the app never rings old alarms.
 */
export function planReminders(repairs: Repair[], role: Role, userId: number, now = Date.now()): Reminder[] {
  const out: Reminder[] = [];
  const nowDate = new Date(now);
  const today = toYmdLocal(nowDate);

  for (const r of mineToRemind(repairs, role, userId)) {
    const due = r.promised_date!;
    const add = (kind: ReminderKind, at: number) => {
      if (at > now + 5000) out.push({ id: `repair-${r.id}-${kind}`, repairId: r.id, kind, at });
    };
    if (due >= today) {
      add('before', atHour(addDaysYmd(due, -1), DAY_BEFORE_HOUR));
      add('today', atHour(due, DUE_DAY_HOUR));
    } else {
      // Late: ring at the next 9:00, today if it has not passed yet.
      const nextDay = nowDate.getHours() < LATE_HOUR ? today : addDaysYmd(today, 1);
      add('late', atHour(nextDay, LATE_HOUR));
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/* When the repair alarms ring, and for whom. */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, setItem: async () => {} },
}));

import { planReminders } from '../src/reminders/plan';
import { Repair } from '../src/api/repairs';

const repair = (over: Partial<Repair>): Repair => ({
  id: 1, ticket_number: 'R-1', device_name: 'Samsung A15', issue: 'Screen', customer_name: 'Ahmed', customer_phone: null,
  status: 'fixing', status_step: 3, estimated_cost: null, actual_cost: null, parts_cost: null,
  received_at: '2026-10-20T08:00:00Z', promised_date: '2026-10-26', days_until_due: 2, is_overdue: false, days_in_shop: 1,
  completed_at: null, delivered_at: null, technician_id: 7, technician_name: 'Teklu', ...over,
});
const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h, 0, 0).getTime();
const now = at(2026, 10, 24, 10); // Sat 24 Oct, 10:00

describe('repair alarms', () => {
  it('rings at 9:00 the day before and 8:00 on the promised day', () => {
    const plan = planReminders([repair({})], 'technician', 7, now);
    expect(plan.map(p => [p.kind, p.at])).toEqual([
      ['before', at(2026, 10, 25, 9)],
      ['today', at(2026, 10, 26, 8)],
    ]);
  });

  it('uses the same alarm ids each time, so planning again replaces instead of adding', () => {
    const a = planReminders([repair({})], 'technician', 7, now).map(p => p.id);
    const b = planReminders([repair({})], 'technician', 7, now + 60_000).map(p => p.id);
    expect(a).toEqual(b);
  });

  it('skips a time that has already passed', () => {
    const plan = planReminders([repair({ promised_date: '2026-10-25' })], 'technician', 7, now);
    expect(plan.map(p => p.kind)).toEqual(['today']);
  });

  it('only rings a technician for their own jobs, the owner for all, sales never', () => {
    const jobs = [repair({ id: 1, technician_id: 7 }), repair({ id: 2, technician_id: 8 }), repair({ id: 3, technician_id: null })];
    expect(new Set(planReminders(jobs, 'technician', 7, now).map(p => p.repairId))).toEqual(new Set([1]));
    expect(new Set(planReminders(jobs, 'owner', 1, now).map(p => p.repairId))).toEqual(new Set([1, 2, 3]));
    expect(planReminders(jobs, 'sales', 9, now)).toEqual([]);
  });

  it('has no alarm for a job that is ready, handed over, or has no promised day', () => {
    const done = [repair({ status: 'completed' }), repair({ id: 2, status: 'delivered' }), repair({ id: 3, promised_date: null })];
    expect(planReminders(done, 'owner', 1, now)).toEqual([]);
  });

  it('rings once at the next 9:00 for a job that is already late', () => {
    const late = repair({ promised_date: '2026-10-22', is_overdue: true });
    expect(planReminders([late], 'technician', 7, now).map(p => [p.kind, p.at])).toEqual([['late', at(2026, 10, 25, 9)]]);
    expect(planReminders([late], 'technician', 7, at(2026, 10, 24, 7)).map(p => p.at)).toEqual([at(2026, 10, 24, 9)]);
  });
});

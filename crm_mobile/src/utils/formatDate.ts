const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  if (diff < 60_000)       return 'Just now';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return formatDate(iso);
}

// ---- Calendar days as 'YYYY-MM-DD' strings (what the server stores) ----
const pad = (n: number) => String(n).padStart(2, '0');

export const toYmd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayYmd = (): string => toYmd(new Date());

export function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysYmd(s: string, n: number): string {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 'Thu 22 Oct'
export function formatDay(s: string | null | undefined): string {
  if (!s) return '—';
  const d = fromYmd(s);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// 'Today' / 'Tomorrow' / 'Yesterday' / 'Thu 22 Oct'
export function formatDayRelative(s: string | null | undefined): string {
  if (!s) return '—';
  const t = todayYmd();
  if (s === t) return 'Today';
  if (s === addDaysYmd(t, 1)) return 'Tomorrow';
  if (s === addDaysYmd(t, -1)) return 'Yesterday';
  return formatDay(s);
}

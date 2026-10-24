import { dateLocale, tr, useLang } from '../i18n';

// 15000 -> "15,000 Br" (the same style as the shop's own app). Amharic writes the unit as ብር.
// Digits stay the same in every language, so prices are never misread.
export function formatBr(amount: number): string {
  const digits = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${digits} ${useLang.getState().lang === 'am' ? 'ብር' : 'Br'}`;
}

export function formatDate(iso: string): string {
  const locale = dateLocale(useLang.getState().lang);
  try {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return tr('time.now');
  if (seconds < 3600) return tr('time.min', { n: Math.floor(seconds / 60) });
  if (seconds < 86400) return tr('time.hour', { n: Math.floor(seconds / 3600) });
  if (seconds < 7 * 86400) return tr('time.day', { n: Math.floor(seconds / 86400) });
  return formatDate(iso);
}

export const productPath = (id: number) => `/product/${id}`;

const group = (n: number) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// 15000 -> "15,000 Br". Used for prices and totals where exact figures matter.
export function formatBr(amount: number | string | null | undefined): string {
  const n = Number(amount) || 0;
  return `${n < 0 ? '-' : ''}${group(Math.abs(n))} Br`;
}

// 1250000 -> "1.3M Br", 15000 -> "15k Br". Used for big dashboard numbers.
export function formatBrCompact(amount: number | string | null | undefined): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M Br`;
  if (abs >= 10_000)    return `${Math.round(n / 1000)}k Br`;
  return formatBr(n);
}

// Plain number with thousands separators, no currency.
export const formatNumber = (n: number | string | null | undefined) => group(Number(n) || 0);

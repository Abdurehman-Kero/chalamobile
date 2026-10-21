// "Today" is the server's local calendar day (the shop computer's clock).
const pad = (n) => String(n).padStart(2, '0');

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Date -> 'YYYY-MM-DD' in local time
const dateString = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 'YYYY-MM-DD' -> local midnight Date, or null if it is not a real date
function parseDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

// Whole days from `from` to `to` (both 'YYYY-MM-DD'); negative when `to` is earlier.
const daysBetween = (from, to) =>
  Math.round((parseDateString(to) - parseDateString(from)) / 86400000);

module.exports = { startOfDay, addDays, dateString, parseDateString, daysBetween };

// Small date helpers. Dates are stored as plain 'YYYY-MM-DD' strings throughout
// the app (no timezone/time-of-day tracking needed for a training log).

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const past = new Date(dateStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  return Math.round((today - past) / 86400000);
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function maxDate(dates) {
  const valid = dates.filter(Boolean);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (a > b ? a : b));
}

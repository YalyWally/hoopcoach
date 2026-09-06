const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export function dayKeyOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return DAY_KEYS[d.getUTCDay()];
}

export function todayISO() {
  return toISODate(new Date());
}

export { DAY_KEYS };

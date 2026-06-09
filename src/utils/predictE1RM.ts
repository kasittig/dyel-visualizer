export function predictE1RM(sessionsByDate: Map<string, number>, targetDate: Date): number | null {
  if (sessionsByDate.size === 0) return null;

  const sorted = [...sessionsByDate.entries()]
    .map(([dateStr, e1rm]) => ({ t: new Date(dateStr).getTime(), e1rm }))
    .sort((a, b) => a.t - b.t);

  if (sorted.length === 1) return sorted[0].e1rm;

  const target = targetDate.getTime();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (target <= first.t) return first.e1rm;

  if (target >= last.t) {
    const prev = sorted[sorted.length - 2];
    const dt = last.t - prev.t;
    const rate = dt === 0 ? 0 : (last.e1rm - prev.e1rm) / dt;
    return last.e1rm + rate * (target - last.t);
  }

  let lo = 0,
    hi = sorted.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].t <= target) lo = mid;
    else hi = mid;
  }
  const a = sorted[lo],
    b = sorted[hi];
  const dt = b.t - a.t;
  if (dt === 0) return a.e1rm;
  return a.e1rm + (b.e1rm - a.e1rm) * ((target - a.t) / dt);
}

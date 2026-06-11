import type { TrainingSession } from "../types/conjugate";

export function calcE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  // Epley formula
  return weight * (1 + reps / 30);
}

export function predictE1RM(sessions: TrainingSession[], targetDate: Date): number | null {
  if (sessions.length === 0) return null;

  const bestByDate = new Map<string, number>();
  for (const { date, e1rm } of sessions) {
    const key = date.toISOString();
    const prev = bestByDate.get(key);
    if (prev === undefined || e1rm > prev) bestByDate.set(key, e1rm);
  }

  const sorted = [...bestByDate.entries()]
    .map(([dateStr, e1rm]) => ({ t: new Date(dateStr).getTime(), e1rm }))
    .sort((a, b) => a.t - b.t);

  if (sorted.length === 1) return sorted[0].e1rm;

  const target = targetDate.getTime();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (target <= first.t) {
    const next = sorted[1];
    const dt = next.t - first.t;
    const rate = dt === 0 ? 0 : (next.e1rm - first.e1rm) / dt;
    return Math.max(0, first.e1rm + rate * (target - first.t));
  }

  if (target >= last.t) {
    const prev = sorted[sorted.length - 2];
    const dt = last.t - prev.t;
    const rate = dt === 0 ? 0 : (last.e1rm - prev.e1rm) / dt;
    return Math.max(0, last.e1rm + rate * (target - last.t));
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

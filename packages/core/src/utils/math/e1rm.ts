import type { TrainingSession } from '../../types/conjugate';

export function calcE1RM(weight: number, reps: number, rpe?: number | null): number {
  const effectiveReps = rpe != null ? reps + (10 - rpe) : reps;
  if (effectiveReps <= 1) {
    return weight;
  }
  // Epley formula
  return weight * (1 + effectiveReps / 30);
}

interface SessionGridPoint {
  t: number;
  e1rm: number;
}

function buildSessionGrid(sessions: TrainingSession[]): SessionGridPoint[] {
  const bestByDate = new Map<string, number>();
  for (const { date, e1rm } of sessions) {
    const key = date.toISOString();
    const prev = bestByDate.get(key);
    if (prev === undefined || e1rm > prev) {
      bestByDate.set(key, e1rm);
    }
  }
  return [...bestByDate.entries()]
    .map(([dateStr, e1rm]) => ({ t: new Date(dateStr).getTime(), e1rm }))
    .sort((a, b) => a.t - b.t);
}

function interpolateGrid(sorted: SessionGridPoint[], targetDate: Date): number | null {
  if (sorted.length === 0) {
    return null;
  }
  if (sorted.length === 1) {
    return sorted[0].e1rm;
  }

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
    if (sorted[mid].t <= target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const a = sorted[lo],
    b = sorted[hi];
  const dt = b.t - a.t;
  if (dt === 0) {
    return a.e1rm;
  }
  return a.e1rm + (b.e1rm - a.e1rm) * ((target - a.t) / dt);
}

export function predictE1RM(sessions: TrainingSession[], targetDate: Date): number | null {
  return interpolateGrid(buildSessionGrid(sessions), targetDate);
}

export function invertE1RM(e1rm: number, reps: number): number {
  if (reps === 1) {
    return e1rm;
  }
  return e1rm / (1 + reps / 30);
}

export function fitVariantFactor(
  baselineSessions: TrainingSession[],
  variantSessions: TrainingSession[]
): { factor: number; sampleCount: number } {
  const grid = buildSessionGrid(baselineSessions);
  const factors: number[] = [];
  for (const session of variantSessions) {
    if (session.reps <= 0) {
      continue;
    }
    const predicted = interpolateGrid(grid, session.date);
    if (predicted === null || predicted === 0) {
      continue;
    }
    factors.push(calcE1RM(session.weight, session.reps, session.rpe) / predicted);
  }
  if (factors.length === 0) {
    return { factor: 0, sampleCount: 0 };
  }
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  return { factor: mean, sampleCount: factors.length };
}

export function applyAddlWtOffset(
  straightSessions: TrainingSession[],
  variantSessions: TrainingSession[]
): { sessions: TrainingSession[]; offset: number; sampleCount: number } {
  const { offset, sampleCount } = fitAddlWtOffset(straightSessions, variantSessions);
  return {
    sessions:
      sampleCount > 0
        ? variantSessions.map((s) => ({ ...s, weight: s.weight + offset }))
        : variantSessions,
    offset,
    sampleCount,
  };
}

export function fitVariantVelocity(sessions: TrainingSession[]): {
  velocityPerMs: number;
  sampleCount: number;
} {
  const grid = buildSessionGrid(sessions);
  if (grid.length < 2) {
    return { velocityPerMs: 0, sampleCount: 0 };
  }
  const n = grid.length;
  const tMean = grid.reduce((s, p) => s + p.t, 0) / n;
  const eMean = grid.reduce((s, p) => s + p.e1rm, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of grid) {
    const dt = p.t - tMean;
    num += dt * (p.e1rm - eMean);
    den += dt * dt;
  }
  if (den === 0) {
    return { velocityPerMs: 0, sampleCount: n };
  }
  return { velocityPerMs: num / den, sampleCount: n };
}

export function fitAddlWtOffset(
  straightSessions: TrainingSession[],
  variantSessions: TrainingSession[]
): { offset: number; sampleCount: number } {
  const grid = buildSessionGrid(straightSessions);
  const offsets: number[] = [];
  for (const session of variantSessions) {
    if (session.reps <= 0) {
      continue;
    }
    const predicted = interpolateGrid(grid, session.date);
    if (predicted === null) {
      continue;
    }
    const effectiveWeight = invertE1RM(predicted, session.reps);
    offsets.push(effectiveWeight - session.weight);
  }
  if (offsets.length === 0) {
    return { offset: 0, sampleCount: 0 };
  }
  const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
  return { offset: mean, sampleCount: offsets.length };
}

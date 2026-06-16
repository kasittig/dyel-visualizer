import type { ConjugateDataPair, TrainingSession } from "../types/conjugate";
import { predictE1RM } from "./e1rm";

function sessionsForVariant(pairs: ConjugateDataPair[], displayName: string): TrainingSession[] {
  return pairs.filter(([ex]) => ex.displayName === displayName).map(([, s]) => s);
}

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    sdX = 0,
    sdY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    sdX += dx * dx;
    sdY += dy * dy;
  }
  if (sdX === 0 || sdY === 0) return NaN;
  return num / Math.sqrt(sdX * sdY);
}

function buildWeeklyGrid(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let cur = start.getTime();
  const endT = end.getTime();
  const week = 7 * 24 * 60 * 60 * 1000;
  while (cur <= endT) {
    dates.push(new Date(cur));
    cur += week;
  }
  return dates;
}

function dateRange(sessions: TrainingSession[]): { first: Date; last: Date } | null {
  if (sessions.length === 0) return null;
  let first = sessions[0].date;
  let last = sessions[0].date;
  for (const { date } of sessions) {
    if (date < first) first = date;
    if (date > last) last = date;
  }
  return { first, last };
}

function correlateVariants(
  sessionsA: TrainingSession[],
  sessionsB: TrainingSession[],
  minOverlap = 5
): number {
  const rangeA = dateRange(sessionsA);
  const rangeB = dateRange(sessionsB);
  if (!rangeA || !rangeB) return NaN;

  const overlapStart = rangeA.first > rangeB.first ? rangeA.first : rangeB.first;
  const overlapEnd = rangeA.last < rangeB.last ? rangeA.last : rangeB.last;
  if (overlapStart > overlapEnd) return NaN;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const date of buildWeeklyGrid(overlapStart, overlapEnd)) {
    const a = predictE1RM(sessionsA, date);
    const b = predictE1RM(sessionsB, date);
    if (a !== null && b !== null) {
      xs.push(a);
      ys.push(b);
    }
  }
  if (xs.length < minOverlap) return NaN;
  return pearsonCorrelation(xs, ys);
}

export function computeCorrelationMatrix(
  pairs: ConjugateDataPair[],
  variantNames: string[],
  minOverlap = 5
): number[][] {
  const sessionsByName = new Map<string, TrainingSession[]>();
  for (const name of variantNames) {
    sessionsByName.set(name, sessionsForVariant(pairs, name));
  }
  const n = variantNames.length;
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1.0 : NaN))
  );
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const r = correlateVariants(
        sessionsByName.get(variantNames[i])!,
        sessionsByName.get(variantNames[j])!,
        minOverlap
      );
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }
  return matrix;
}

export function selectTopCrossLiftVariants(
  pairs: ConjugateDataPair[],
  sqVariants: string[],
  bpVariants: string[],
  dlVariants: string[],
  baselineSq: string | undefined,
  baselineBp: string | undefined,
  baselineDl: string | undefined,
  topPerLift = 3
): { squat: string[]; bench: string[]; deadlift: string[] } {
  const allVariants = [...new Set([...sqVariants, ...bpVariants, ...dlVariants])];
  const sessionsByName = new Map<string, TrainingSession[]>();
  for (const name of allVariants) {
    sessionsByName.set(name, sessionsForVariant(pairs, name));
  }

  function correlate(a: string, b: string): number {
    return correlateVariants(sessionsByName.get(a)!, sessionsByName.get(b)!);
  }

  function pickTop(candidates: string[], others: string[], baseline: string | undefined): string[] {
    const scores = candidates.map((name) => {
      let sum = 0,
        count = 0;
      for (const other of others) {
        const r = correlate(name, other);
        if (!isNaN(r)) {
          sum += Math.abs(r);
          count++;
        }
      }
      return { name, score: count === 0 ? 0 : sum / count };
    });
    scores.sort((a, b) => b.score - a.score);
    const picked = new Set<string>();
    if (baseline && candidates.includes(baseline)) picked.add(baseline);
    for (const { name } of scores) {
      if (picked.size >= topPerLift) break;
      picked.add(name);
    }
    return candidates.filter((n) => picked.has(n));
  }

  return {
    squat: pickTop(sqVariants, [...bpVariants, ...dlVariants], baselineSq),
    bench: pickTop(bpVariants, [...sqVariants, ...dlVariants], baselineBp),
    deadlift: pickTop(dlVariants, [...sqVariants, ...bpVariants], baselineDl),
  };
}

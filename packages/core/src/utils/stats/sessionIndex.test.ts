import { describe, it, expect } from 'vitest';
import { buildSessionStats } from './sessionIndex';
import { nameToExercise } from '../parsing/parseConjugateData';
import type { ConjugateDataPair, TrainingSession } from '../../types/conjugate';

function session(dateStr: string, weight: number, reps: number, sets = 1): TrainingSession {
  return {
    date: new Date(dateStr + 'T00:00:00'),
    weight,
    reps,
    sets,
    e1rm: weight * (1 + reps / 30),
    unit: 'lbs',
  };
}

function pair(name: string, s: TrainingSession): ConjugateDataPair {
  const ex = nameToExercise(name);
  if (!ex) {
    throw new Error(`nameToExercise returned null for "${name}"`);
  }
  return [ex, s];
}

describe('buildSessionStats', () => {
  const today = new Date('2024-06-01T00:00:00');

  it('tracks the last session per exercise', () => {
    const pairs: ConjugateDataPair[] = [
      pair('Squat', session('2024-01-01', 300, 1)),
      pair('Squat', session('2024-03-01', 320, 1)),
      pair('Squat', session('2024-03-01', 315, 2)),
    ];
    const stats = buildSessionStats(pairs, {}, today);
    const last = stats.lastSession.get('Squat');
    expect(last?.date).toEqual(new Date('2024-03-01T00:00:00'));
    // 315 × (1 + 2/30) = 336 > 320 × (1 + 1/30) ≈ 330.67, so 315×2r wins
    expect(last?.e1rm).toBeCloseTo(315 * (1 + 2 / 30));
    expect(last?.weight).toBe(315);
    expect(last?.reps).toBe(2);
    expect(last?.sets).toBe(1);
  });

  it('returns addlWtOffset of 0 samples when no straight sessions exist', () => {
    const pairs: ConjugateDataPair[] = [pair('Squat (chains)', session('2024-01-01', 250, 3))];
    const stats = buildSessionStats(pairs, {}, today);
    expect(stats.addlWtOffset.get('Squat (chains)')?.sampleCount).toBe(0);
  });

  it('computes addlWtOffset from paired straight/chain sessions', () => {
    const pairs: ConjugateDataPair[] = [
      pair('Squat', session('2024-01-01', 300, 5)),
      pair('Squat (chains)', session('2024-01-01', 260, 5)),
    ];
    const stats = buildSessionStats(pairs, { squat: 'Squat' }, today);
    const off = stats.addlWtOffset.get('Squat (chains)');
    expect(off).toBeDefined();
    expect(off!.sampleCount).toBeGreaterThan(0);
    // Straight e1rm at that date is 300*(1+5/30); invertE1RM back to 5 reps = 300; offset = 300-260 = 40
    expect(off!.offset).toBeCloseTo(40, 0);
  });

  it('computes no variantFactor for an exercise whose type has no baseline', () => {
    const pairs: ConjugateDataPair[] = [
      pair('Squat', session('2024-01-01', 300, 1)),
      pair('Deadlift', session('2024-01-01', 350, 1)),
    ];
    // baselineNames has squat but not deadlift — Deadlift should still get a
    // variantFactor entry (factor computed against empty baseline sessions)
    const stats = buildSessionStats(pairs, { squat: 'Squat' }, today);
    expect(stats.variantFactor.has('Deadlift')).toBe(true);
    expect(stats.variantFactor.has('Squat')).toBe(false); // baseline skipped
  });

  it('computes variantFactor for a non-baseline lift', () => {
    const pairs: ConjugateDataPair[] = [
      pair('Squat', session('2024-01-01', 300, 1)),
      pair('Squat', session('2024-03-01', 320, 1)),
      pair('SSB Squat', session('2024-02-01', 270, 1)),
    ];
    const stats = buildSessionStats(pairs, { squat: 'Squat' }, today);
    const vf = stats.variantFactor.get('SSB Squat');
    expect(vf).toBeDefined();
    expect(vf!.sampleCount).toBeGreaterThan(0);
    expect(vf!.factor).toBeGreaterThan(0);
    expect(vf!.factor).toBeLessThan(1.5);
  });

  it('projects e1RM for all exercises', () => {
    const pairs: ConjugateDataPair[] = [
      pair('Bench Press', session('2024-01-01', 200, 1)),
      pair('Bench Press', session('2024-03-01', 220, 1)),
    ];
    const stats = buildSessionStats(pairs, {}, today);
    const proj = stats.projectedE1RM.get('Bench Press');
    expect(proj).toBeDefined();
    expect(proj).toBeGreaterThan(0);
  });

  it('returns empty maps for empty input', () => {
    const stats = buildSessionStats([], {}, today);
    expect(stats.lastSession.size).toBe(0);
    expect(stats.addlWtOffset.size).toBe(0);
    expect(stats.variantFactor.size).toBe(0);
    expect(stats.projectedE1RM.size).toBe(0);
  });

  it('enriches comp projection via velocity aggregation from variant sessions when sampleCount >= 2', () => {
    // Comp: one old session at 300. Variant (SSB): two sessions trending up.
    // The upward SSB velocity / SSB factor gives a positive comp-equivalent velocity,
    // which extrapolates the comp anchor (310) upward to a future date.
    const future = new Date('2024-09-01T00:00:00');
    const pairs: ConjugateDataPair[] = [
      pair('Squat', session('2024-01-01', 300, 1)),
      pair('SSB Squat', session('2024-02-01', 270, 1)),
      pair('SSB Squat', session('2024-05-01', 310, 1)),
    ];
    const stats = buildSessionStats(pairs, { squat: 'Squat' }, future);
    const proj = stats.projectedE1RM.get('Squat');
    expect(proj).toBeDefined();
    expect(proj!).toBeGreaterThan(300);
  });

  it('does not enrich comp projection when comp already has 2+ sessions', () => {
    // Comp: two sessions (trend: flat at 300). Variant (SSB): two sessions trending strongly up.
    // Because comp has 2 sessions, Pass 4 skips enrichment entirely.
    // projectedE1RM["Squat"] should come from comp's own trend, not variant velocity.
    const future = new Date('2024-09-01T00:00:00');
    const pairs: ConjugateDataPair[] = [
      pair('Squat', session('2024-01-01', 300, 1)),
      pair('Squat', session('2024-03-01', 300, 1)),
      pair('SSB Squat', session('2024-02-01', 270, 1)),
      pair('SSB Squat', session('2024-05-01', 370, 1)), // big upward trend
    ];
    const stats = buildSessionStats(pairs, { squat: 'Squat' }, future);
    // Comp's own two sessions are flat → projection stays flat (~310), not inflated by SSB trend
    const compProjection = stats.projectedE1RM.get('Squat');
    expect(compProjection).toBeDefined();
    expect(compProjection!).toBeCloseTo(300 * (1 + 1 / 30), 0);
  });

  it('does not back-project from variants with sampleCount < 2', () => {
    // Only one SSB session — factor has sampleCount=1, should not enrich comp.
    const future = new Date('2024-09-01T00:00:00');
    const pairs: ConjugateDataPair[] = [
      pair('Squat', session('2024-01-01', 300, 1)),
      pair('SSB Squat', session('2024-05-01', 350, 1)),
    ];
    const stats = buildSessionStats(pairs, { squat: 'Squat' }, future);
    const proj = stats.projectedE1RM.get('Squat');
    // With only one comp session and no back-projection, projectedE1RM is that session's stored
    // e1rm (300 * (1 + 1/30) ≈ 310), regardless of how far into the future we project.
    expect(proj).toBeCloseTo(300 * (1 + 1 / 30), 0);
  });
});

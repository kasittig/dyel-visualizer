import { validateRow } from './validateRow';
import { describe, it, expect } from 'vitest';

describe('validateRow', () => {
  it('returns one session for valid weight/reps', () => {
    const r = validateRow({ weight: '405', reps: '2' });
    expect(r.problems).toEqual([]);
    expect(r.sessionsInRow).toBe(1);
  });

  it('flags missing weight', () => {
    const r = validateRow({ reps: '2' });
    expect(r.problems.some((p) => p.includes('Weight is missing'))).toBe(true);
    expect(r.sessionsInRow).toBe(0);
  });

  it('flags invalid weight', () => {
    const r = validateRow({ weight: 'abc', reps: '2' });
    expect(r.problems.some((p) => p.includes('Invalid weight'))).toBe(true);
  });

  it('warns on missing reps but still counts a session', () => {
    const r = validateRow({ weight: '405' });
    expect(r.warnings.some((w) => w.includes('Reps is missing'))).toBe(true);
    expect(r.sessionsInRow).toBe(1);
  });

  it('flags invalid reps', () => {
    const r = validateRow({ weight: '405', reps: '-1' });
    expect(r.problems.some((p) => p.includes('Invalid reps'))).toBe(true);
    expect(r.sessionsInRow).toBe(0);
  });

  it('warns on out-of-range RPE', () => {
    const r = validateRow({ weight: '405', reps: '2', rpe: '11' });
    expect(r.warnings.some((w) => w.includes('Invalid RPE'))).toBe(true);
  });

  it('accepts in-range RPE without warning', () => {
    const r = validateRow({ weight: '405', reps: '2', rpe: '8' });
    expect(r.warnings.some((w) => w.includes('Invalid RPE'))).toBe(false);
  });
});

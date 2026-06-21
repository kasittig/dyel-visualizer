import { describe, it, expect } from 'vitest';
import { defaultBaselineName, defaultCompExerciseName } from './defaultSelections';
import type { ConjugateDataPair } from '../../types/conjugate';

function pair(
  displayName: string,
  date: string,
  e1rm: number,
  opts: Partial<{
    type: ConjugateDataPair[0]['type'];
    bar: ConjugateDataPair[0]['bar'];
    stance: ConjugateDataPair[0]['stance'];
    equipment: ConjugateDataPair[0]['equipment'];
    addlWts: ConjugateDataPair[0]['addlWts'];
  }> = {}
): ConjugateDataPair {
  return [
    {
      displayName,
      type: opts.type ?? 'squat',
      bar: opts.bar ?? 'standard',
      stance: opts.stance ?? 'competition',
      addlWts: opts.addlWts ?? [],
      equipment: opts.equipment ?? null,
      movementCategory: ['anchor'],
      averageIndex: null,
      expectedBaseline: null,
      status: null,
      diagnostic: null,
      effects: [],
    },
    { date: new Date(date + 'T00:00:00'), sets: 1, reps: 1, weight: 100, e1rm, unit: 'lbs' },
  ];
}

describe('defaultBaselineName', () => {
  it('returns null for empty input', () => {
    expect(defaultBaselineName([])).toBeNull();
  });

  it('returns the only exercise for a single entry', () => {
    expect(defaultBaselineName([pair('Squat', '2024-01-01', 300)])).toBe('Squat');
  });

  it('returns the most recently trained exercise', () => {
    const rows = [pair('Squat', '2024-01-01', 300), pair('Bench', '2024-02-01', 200)];
    expect(defaultBaselineName(rows)).toBe('Bench');
  });

  it('breaks ties by highest e1RM on the same date', () => {
    const rows = [pair('Squat', '2024-02-01', 300), pair('Bench', '2024-02-01', 350)];
    expect(defaultBaselineName(rows)).toBe('Bench');
  });

  it('uses the highest e1RM session when multiple sessions exist for same exercise on same date', () => {
    const rows = [
      pair('Squat', '2024-02-01', 300),
      pair('Squat', '2024-02-01', 350),
      pair('Bench', '2024-02-01', 340),
    ];
    // Squat's best on that day is 350 > Bench's 340
    expect(defaultBaselineName(rows)).toBe('Squat');
  });

  it('tracks last date per exercise, not global last date', () => {
    const rows = [
      pair('Squat', '2024-02-01', 300),
      pair('Bench', '2024-01-01', 200),
      pair('Squat', '2024-01-15', 280),
    ];
    // Squat's last date is 2024-02-01; Bench's is 2024-01-01
    expect(defaultBaselineName(rows)).toBe('Squat');
  });
});

describe('defaultTargetName', () => {
  it('returns null for empty input', () => {
    expect(defaultCompExerciseName([])).toBeNull();
  });

  it('returns the first competition/standard/no-equipment/no-addlWt exercise', () => {
    const rows = [
      pair('SSB Squat', '2024-01-01', 300, { bar: 'ssb' }),
      pair('Squat', '2024-01-01', 280),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Squat');
  });

  it('falls back to the first exercise when no match', () => {
    const rows = [
      pair('SSB Squat', '2024-01-01', 300, { bar: 'ssb' }),
      pair('Cambered Squat', '2024-01-01', 280, { bar: 'cambered' }),
    ];
    expect(defaultCompExerciseName(rows)).toBe('SSB Squat');
  });

  it('deduplicates by displayName — only considers each exercise once', () => {
    const rows = [
      pair('SSB Squat', '2024-01-01', 300, { bar: 'ssb' }),
      pair('Squat', '2024-01-01', 280),
      pair('Squat', '2024-02-01', 290),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Squat');
  });

  it('excludes exercises with equipment', () => {
    const rows = [
      pair('Box Squat', '2024-01-01', 300, { equipment: 'box' }),
      pair('Squat', '2024-01-01', 280),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Squat');
  });

  it('excludes exercises with addlWts', () => {
    const rows = [
      pair('Band Squat', '2024-01-01', 300, { addlWts: ['bands'] }),
      pair('Squat', '2024-01-01', 280),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Squat');
  });

  it('prefers bench w/commands over plain bench when both are present', () => {
    const rows = [
      pair('Bench', '2024-01-01', 280, { type: 'bench' }),
      pair('Bench w/Commands', '2024-01-01', 260, { type: 'bench', equipment: 'pause' }),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Bench w/Commands');
  });

  it('returns plain bench when no commands variant exists', () => {
    const rows = [
      pair('SSB Bench', '2024-01-01', 300, { type: 'bench', bar: 'ssb' }),
      pair('Bench', '2024-01-01', 280, { type: 'bench' }),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Bench');
  });

  it('returns bench w/commands when it is the only bench variant', () => {
    const rows = [
      pair('Bench w/Commands', '2024-01-01', 260, { type: 'bench', equipment: 'pause' }),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Bench w/Commands');
  });

  it('does not prefer pause equipment for non-bench lifts', () => {
    const rows = [
      pair('Pause Squat', '2024-01-01', 300, { equipment: 'pause' }),
      pair('Squat', '2024-01-01', 280),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Squat');
  });
  it('returns competition deadlift when it exists', () => {
    const rows = [
      pair('Deadlift', '2024-01-01', 300, { type: 'deadlift', stance: 'competition' }),
      pair('Sumo Deadlift', '2024-01-02', 260, { type: 'deadlift', stance: 'sumo' }),
    ];
    expect(defaultCompExerciseName(rows)).toBe('Deadlift');
  });
  it('returns preferred deadlift when one is given', () => {
    const rows = [
      pair('Conventional Deadlift', '2024-01-01', 300, {
        type: 'deadlift',
        stance: 'conventional',
      }),
      pair('Sumo Deadlift', '2024-01-02', 260, { type: 'deadlift', stance: 'sumo' }),
    ];
    expect(defaultCompExerciseName(rows, 'conventional')).toBe('Conventional Deadlift');
  });
});

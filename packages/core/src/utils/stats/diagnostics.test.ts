import { describe, it, expect } from 'vitest';
import { generateDiagnostics } from './diagnostics';
import { calcE1RM } from '../math/e1rm';
import type { ConjugateDataPair, ConjugateExercise, TrainingSession } from '../../types/conjugate';

function ex(overrides: Partial<ConjugateExercise> = {}): ConjugateExercise {
  return {
    type: 'squat',
    bar: 'standard',
    stance: 'competition',
    addlWts: [],
    equipment: null,
    displayName: 'squat',
    averageIndex: null,
    expectedBaseline: null,
    status: null,
    diagnostic: null,
    effects: [],
    ...overrides,
  };
}

describe('__MODIFIER__EFFECTS__', () => {
  it('equipment:board:bench has min 105, max 115', () => {
    const e = __MODIFIER__EFFECTS__['equipment:board:bench'];
    expect(e).toBeDefined();
    expect('min' in e).toBe(true);
    if ('min' in e) {
      expect(e.min).toBe(105);
      expect(e.max).toBe(115);
    }
  });

  it('equipment:floor:bench has min 85, max 95', () => {
    const e = __MODIFIER__EFFECTS__['equipment:floor:bench'];
    expect(e).toBeDefined();
    expect('min' in e).toBe(true);
    if ('min' in e) {
      expect(e.min).toBe(85);
      expect(e.max).toBe(95);
    }
  });

  it('equipment:rack:deadlift has min 110, max 130', () => {
    const e = __MODIFIER__EFFECTS__['equipment:rack:deadlift'];
    expect(e).toBeDefined();
    expect('min' in e).toBe(true);
    if ('min' in e) {
      expect(e.min).toBe(110);
      expect(e.max).toBe(130);
    }
  });

  it('stance:romanian:deadlift has min 60, max 75', () => {
    const e = __MODIFIER__EFFECTS__['stance:romanian:deadlift'];
    expect(e).toBeDefined();
    expect('min' in e).toBe(true);
    if ('min' in e) {
      expect(e.min).toBe(60);
      expect(e.max).toBe(75);
    }
  });

  it('addl_wt:chains:squat has no min/max', () => {
    const e = __MODIFIER__EFFECTS__['addl_wt:chains:squat'];
    expect(e).toBeDefined();
    expect('min' in e).toBe(false);
  });

  it('equipment:board:bench effects contain TRICEP_DOMINANT and SUPRAMAXIMAL', () => {
    const e = __MODIFIER__EFFECTS__['equipment:board:bench'];
    expect(e.effects).toContain('TRICEP_DOMINANT');
    expect(e.effects).toContain('SUPRAMAXIMAL');
  });

  it('stance:ssb:squat does not exist (key is bar:ssb:squat)', () => {
    expect(__MODIFIER__EFFECTS__['stance:ssb:squat']).toBeUndefined();
    expect(__MODIFIER__EFFECTS__['bar:ssb:squat']).toBeDefined();
  });
});

function session(date: string, weight: number, reps = 1): TrainingSession {
  return {
    date: new Date(date + 'T00:00:00'),
    sets: 1,
    reps,
    weight,
    e1rm: calcE1RM(weight, reps),
    unit: 'lbs',
    rpe: null,
  };
}

function pair(overrides: Partial<ConjugateExercise>, s: TrainingSession): ConjugateDataPair {
  const base: ConjugateExercise = {
    type: 'bench',
    bar: 'standard',
    stance: null,
    addlWts: [],
    equipment: null,
    displayName: 'bench press',
    averageIndex: null,
    expectedBaseline: null,
    status: null,
    diagnostic: null,
    effects: [],
    ...overrides,
  };
  return [base, s];
}

describe('generateDiagnostics', () => {
  it('emits a result when factor meets the baseline floor', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      pair({ displayName: 'bench press' }, session('2024-01-08', 305)),
      pair({ displayName: 'board press', equipment: 'board' }, session('2024-01-04', 280)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.type).toBe('bench');
    expect(r.displayName).toBe('board press');
    expect(r.expectedBaseline).toBe('105–115%');
    expect(['optimal', 'weakness', 'overtrained']).toContain(r.status);
    expect(r.diagnostic).toMatch(/^board press at \d+%$/);
  });

  it('board press result includes TRICEP_DOMINANT and SUPRAMAXIMAL effects', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      pair({ displayName: 'board press', equipment: 'board' }, session('2024-01-01', 280)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results[0].effects).toContain('TRICEP_DOMINANT');
    expect(results[0].effects).toContain('SUPRAMAXIMAL');
  });

  it('emits a Weakness result when factor falls below the baseline floor', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      // board press at only 80% of anchor → below 105% floor
      pair({ displayName: 'board press', equipment: 'board' }, session('2024-01-01', 240)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('weakness');
  });

  it('emits an Optimal result when factor meets the baseline floor (exact boundary)', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 100)),
      // floor press at exactly 85% of anchor → meets 85% floor (equipment:floor:bench = 85-95%)
      pair({ displayName: 'floor press', equipment: 'floor' }, session('2024-01-01', 85)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results[0].status).toBe('optimal');
  });

  it('floor press baseline is 85–95% (from CSV)', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      pair({ displayName: 'floor press', equipment: 'floor' }, session('2024-01-01', 260)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results).toHaveLength(1);
    expect(results[0].expectedBaseline).toBe('85–95%');
  });

  it('skips variations with sampleCount === 0 (no date overlap with anchor)', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      // Variation with reps: 0 → fitVariantFactor skips it → sampleCount 0
      pair(
        { displayName: 'board press', equipment: 'board' },
        { ...session('2024-06-01', 280), reps: 0 }
      ),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results).toHaveLength(0);
  });

  it('skips accessory exercises entirely', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ type: 'accessory', displayName: 'tricep pushdown' }, session('2024-01-01', 100)),
    ];
    expect(generateDiagnostics(pairs, 'bench press')).toHaveLength(0);
  });

  it('skips variations with no non-standard modifier to look up', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      // standard bar, null stance, no equipment → no modifier key → skipped
      pair({ displayName: 'wide grip bench', stance: null }, session('2024-01-01', 260)),
    ];
    expect(generateDiagnostics(pairs, 'bench press')).toHaveLength(0);
  });

  it('opposite-stance DL with conventional primary produces sumo result (opposite = sumo)', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ type: 'deadlift', displayName: 'deadlift' }, session('2024-01-01', 500)),
      pair(
        { type: 'deadlift', stance: 'opposite', displayName: 'deadlift (opposite)' },
        session('2024-01-01', 460)
      ),
    ];
    const results = generateDiagnostics(pairs, 'deadlift', 'conventional');
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('deadlift (opposite)');
  });

  it('sumo-stance DL with sumo primary produces posterior_chain result', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ type: 'deadlift', displayName: 'deadlift' }, session('2024-01-01', 500)),
      pair(
        {
          type: 'deadlift',
          stance: 'sumo',
          displayName: 'deadlift (sumo)',
        },
        session('2024-01-01', 460)
      ),
    ];
    // stance:sumo:deadlift has a baseline (90–100%)
    const results = generateDiagnostics(pairs, 'deadlift', 'conventional');
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('deadlift (sumo)');
    expect(results[0].effects).toContain('POSTERIOR_CHAIN');
  });

  it('emits an Overtrained result when factor exceeds the baseline ceiling', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 100)),
      // floor press at 100% of anchor → above 95% ceiling (equipment:floor:bench = 85-95%)
      pair({ displayName: 'floor press', equipment: 'floor' }, session('2024-01-01', 100)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results[0].status).toBe('overtrained');
  });

  it('SSB + pause squat combines bar:ssb + equipment:pause multiplicatively (77–90%)', () => {
    const anchor: ConjugateDataPair = [
      ex({
        type: 'squat',
        bar: 'standard',
        stance: 'competition',
        displayName: 'squat',
      }),
      session('2024-01-01', 100),
    ];
    const variation: ConjugateDataPair = [
      ex({
        type: 'squat',
        bar: 'ssb',
        stance: null,
        equipment: 'pause',
        displayName: 'ssb pause squat',
      }),
      session('2024-01-01', 77),
    ];
    const results = generateDiagnostics([anchor, variation], 'squat');
    expect(results).toHaveLength(1);
    // bar:ssb:squat (90–95%) × equipment:pause:squat (85–95%) = 77–90%
    expect(results[0].expectedBaseline).toBe('77–90%');
    expect(results[0].effects).toContain('UPPER_BACK_DEMAND'); // from SSB
    expect(results[0].effects).toContain('DEAD_STOP'); // from pause
  });

  it('SSB + box squat combines bar:ssb + equipment:box multiplicatively (81–95%)', () => {
    const anchor: ConjugateDataPair = [
      ex({
        type: 'squat',
        bar: 'standard',
        stance: 'competition',
        displayName: 'squat',
      }),
      session('2024-01-01', 100),
    ];
    const variation: ConjugateDataPair = [
      ex({
        type: 'squat',
        bar: 'ssb',
        stance: null,
        equipment: 'box',
        displayName: 'ssb box squat',
      }),
      session('2024-01-01', 81),
    ];
    const results = generateDiagnostics([anchor, variation], 'squat');
    expect(results).toHaveLength(1);
    // equipment:box:squat (90–100%) × bar:ssb:squat (90–95%) = 81–95%
    expect(results[0].expectedBaseline).toBe('81–95%');
  });

  it('single-modifier baseline is unchanged (board press → 105–115%)', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      pair({ displayName: 'board press', equipment: 'board' }, session('2024-01-01', 315)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results).toHaveLength(1);
    expect(results[0].expectedBaseline).toBe('105–115%');
  });

  it('uses bench w/commands as anchor when present, measuring other variations against it', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        {
          stance: 'competition',
          equipment: 'pause',
          displayName: 'bench w/commands',
        },
        session('2024-01-01', 250)
      ),
      pair({ displayName: 'board press', equipment: 'board' }, session('2024-01-01', 270)),
    ];
    const results = generateDiagnostics(pairs, 'bench w/commands');
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('board press');
    expect(results[0].type).toBe('bench');
    expect(results[0].expectedBaseline).toBe('105–115%');
  });

  it('falls back to plain bench as anchor when no bench w/commands is present', () => {
    const pairs: ConjugateDataPair[] = [
      pair({ stance: 'competition', displayName: 'bench press' }, session('2024-01-01', 300)),
      pair({ displayName: 'board press', equipment: 'board' }, session('2024-01-01', 270)),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('board press');
  });

  it('deadlift with addlWts is not treated as anchor (prevents phantom anchor from bands e1RM)', () => {
    // Bands e1RM is far below straight-bar max; if included in the anchor grid it creates a
    // steep negative slope that backward-extrapolates into absurd predicted anchors.
    const pairs: ConjugateDataPair[] = [
      pair(
        {
          type: 'deadlift',
          displayName: 'deadlift',
          addlWts: [],
        },
        session('2024-02-01', 250)
      ),
      pair(
        {
          type: 'deadlift',
          displayName: 'deadlift (bands)',
          addlWts: ['bands'],
        },
        session('2024-02-08', 190)
      ),
      pair(
        {
          type: 'deadlift',
          displayName: 'deficit deadlift',
          equipment: 'deficit',
          addlWts: [],
        },
        session('2024-02-01', 220)
      ),
    ];
    const results = generateDiagnostics(pairs, 'deadlift');
    const deficit = results.find((r) => r.displayName === 'deficit deadlift');
    expect(deficit).toBeDefined();
    // Anchor grid should only contain the straight-bar session (250).
    // deficit factor = 220/250 = 88% → within 85–95% → optimal
    expect(deficit!.status).toBe('optimal');
  });

  it('addlWt variations without straight-family sessions are skipped (cannot estimate offset)', () => {
    // Without any same-family straight sessions to fit against, applyAddlWtOffset returns
    // sampleCount 0 and the variation is skipped.
    const pairs: ConjugateDataPair[] = [
      pair({ displayName: 'bench press' }, session('2024-01-01', 300)),
      pair(
        {
          bar: 'swiss',
          displayName: 'swiss bar bench (chain)',
          addlWts: ['chains'],
        },
        session('2024-01-01', 270)
      ),
      pair(
        {
          equipment: 'floor',
          displayName: 'floor press (chain)',
          addlWts: ['chains'],
        },
        session('2024-01-01', 255)
      ),
    ];
    const results = generateDiagnostics(pairs, 'bench press');
    // No straight swiss-bar bench or straight floor press sessions exist,
    // so both chain variants cannot get an offset estimate and are skipped.
    expect(results).toHaveLength(0);
  });

  it('chains squat appears in results when straight-family sessions exist for offset fitting', () => {
    // The anchor (standard squat) serves as the straight-family reference for the chains
    // squat (same familyKey). After offset adjustment, the chains squat compares against
    // the anchor at ~100% → baseline of 100–100%.
    const STRAIGHT_WEIGHT = 500;
    const CHAIN_WEIGHT = 50; // estimated chain load
    const pairs: ConjugateDataPair[] = [
      pair(
        { type: 'squat', bar: 'standard', stance: 'competition', displayName: 'squat' },
        session('2024-01-01', STRAIGHT_WEIGHT)
      ),
      pair(
        {
          type: 'squat',
          bar: 'standard',
          stance: 'competition',
          addlWts: ['chains'],
          displayName: 'squat w/chains',
        },
        session('2024-01-01', STRAIGHT_WEIGHT - CHAIN_WEIGHT)
      ),
    ];
    const results = generateDiagnostics(pairs, 'squat');
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.displayName).toBe('squat w/chains');
    expect(r.expectedBaseline).toBe('100–100%');
    expect(r.averageIndex).toBeCloseTo(100, 0);
    expect(r.status).toBe('optimal');
    expect(r.effects).toContain('BAR_SPEED');
  });

  it('chains squat shows weakness when offset-adjusted factor is below 100%', () => {
    // Use distinct familyKeys for anchor (stance:'competition') and chains squat
    // (stance:null) so the chains offset is fitted against a separate straight squat
    // session (not the anchor). This lets the anchor be stronger than the straight
    // reference, making the chains squat look like a weakness after adjustment.
    const pairs: ConjugateDataPair[] = [
      // Anchor: competition squat at 500
      pair(
        { type: 'squat', bar: 'standard', stance: 'competition', displayName: 'squat' },
        session('2024-01-01', 500)
      ),
      // Straight reference for offset fitting (no stance → different familyKey than anchor)
      pair(
        { type: 'squat', bar: 'standard', stance: null, displayName: 'straight squat' },
        session('2024-01-01', 470)
      ),
      // Chains squat (no stance, same family as straight reference)
      // offset = invertE1RM(470,1) - 420 = 470 - 420 = 50
      // adjusted weight = 420 + 50 = 470
      // factor = calcE1RM(470,1) / 500 = 94% → weakness
      pair(
        {
          type: 'squat',
          bar: 'standard',
          stance: null,
          addlWts: ['chains'],
          displayName: 'squat w/chains',
        },
        session('2024-01-01', 420)
      ),
    ];
    const results = generateDiagnostics(pairs, 'squat');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('weakness');
  });

  it('SSB chains squat uses SSB pct range (90–95%) after offset adjustment', () => {
    // familyKey of SSB chains squat = squat|ssb||
    // Offset is fitted against straight SSB sessions (same family, no addlWts).
    const STRAIGHT_SSB_WEIGHT = 400;
    const CHAIN_WEIGHT = 40;
    const anchor: ConjugateDataPair = [
      ex({ type: 'squat', bar: 'standard', stance: 'competition', displayName: 'squat' }),
      session('2024-01-01', 500),
    ];
    const straightSsb: ConjugateDataPair = [
      ex({ type: 'squat', bar: 'ssb', stance: null, displayName: 'ssb squat' }),
      session('2024-01-01', STRAIGHT_SSB_WEIGHT),
    ];
    const ssbChains: ConjugateDataPair = [
      ex({
        type: 'squat',
        bar: 'ssb',
        stance: null,
        addlWts: ['chains'],
        displayName: 'ssb squat w/chains',
      }),
      session('2024-01-01', STRAIGHT_SSB_WEIGHT - CHAIN_WEIGHT),
    ];
    const results = generateDiagnostics([anchor, straightSsb, ssbChains], 'squat');
    const r = results.find((x) => x.displayName === 'ssb squat w/chains');
    expect(r).toBeDefined();
    expect(r!.expectedBaseline).toBe('90–95%');
    expect(r!.effects).toContain('UPPER_BACK_DEMAND'); // from SSB
  });
});

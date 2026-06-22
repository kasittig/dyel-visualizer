import { describe, it, expect } from 'vitest';
import { toMovementCategory, generateDiagnostics } from './diagnostics';
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
    movementCategory: ['anchor'],
    averageIndex: null,
    expectedBaseline: null,
    status: null,
    diagnostic: null,
    effects: [],
    ...overrides,
  };
}

describe('toMovementCategory', () => {
  it('competition stance → ["anchor"]', () => {
    expect(toMovementCategory(ex({ stance: 'competition' }))).toEqual(['anchor']);
  });

  it('board equipment (null stance) → ["xxx"]', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: 'board' }))).toEqual(['xxx']);
  });

  it('floor equipment (null stance) → ["xxx"]', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: 'floor' }))).toEqual(['xxx']);
  });

  it('blocks equipment (null stance) → ["xxx"]', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: 'blocks' }))).toEqual(['xxx']);
  });

  it('rack equipment (null stance) → ["xxx"]', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: 'rack' }))).toEqual(['xxx']);
  });

  it('close stance → ["xxx"]', () => {
    expect(toMovementCategory(ex({ stance: 'close' }))).toEqual(['xxx']);
  });

  it('deficit equipment (null stance) → ["xxx"]', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: 'deficit' }))).toEqual(['xxx']);
  });

  it('pause equipment (null stance) → ["xxx"]', () => {
    expect(toMovementCategory(ex({ stance: null, equipment: 'pause' }))).toEqual(['xxx']);
  });

  it('squat + ssb bar → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: null, bar: 'ssb' }))).toEqual(['xxx']);
  });

  it('squat + goblet bar → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: null, bar: 'goblet' }))).toEqual(['xxx']);
  });

  it('squat + trap bar → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: null, bar: 'trap' }))).toEqual(['xxx']);
  });

  it('squat + front stance → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: 'front' }))).toEqual(['xxx']);
  });

  it('deadlift + romanian stance → ["xxx"]', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'romanian', equipment: null }))
    ).toEqual(['xxx']);
  });

  it('squat + box equipment (null stance) → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: null, equipment: 'box' }))).toEqual([
      'xxx',
    ]);
  });

  it('slingshot stance → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'bench', stance: 'slingshot' }))).toEqual(['xxx']);
  });

  it('builder stance → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'bench', stance: 'builder' }))).toEqual(['xxx']);
  });

  it('narrow stance → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'bench', stance: 'narrow' }))).toEqual(['xxx']);
  });

  it('bare deadlift (no stance) + no preference (default sumo) → ["posterior_chain"]', () => {
    expect(toMovementCategory(ex({ type: 'deadlift', stance: null, equipment: null }))).toEqual([
      'posterior_chain',
    ]);
  });

  it('bare deadlift (no stance) + conventional primary → ["quad_dominant"]', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: null, equipment: null }), 'conventional')
    ).toEqual(['quad_dominant']);
  });

  it('bare deadlift (no stance) + sumo primary → ["posterior_chain"]', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: null, equipment: null }), 'sumo')
    ).toEqual(['posterior_chain']);
  });

  it('deadlift + sumo stance → ["posterior_chain"] (sumo is posterior chain dominant)', () => {
    expect(toMovementCategory(ex({ type: 'deadlift', stance: 'sumo', equipment: null }))).toEqual([
      'posterior_chain',
    ]);
  });

  it('deadlift + sumo stance + sumo primary → ["posterior_chain"]', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'sumo', equipment: null }), 'sumo')
    ).toEqual(['posterior_chain']);
  });

  it('deadlift + conventional stance → ["quad_dominant"] (conventional is quad dominant)', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'conventional', equipment: null }))
    ).toEqual(['quad_dominant']);
  });

  it('deadlift + conventional stance + sumo primary → ["quad_dominant"]', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'conventional', equipment: null }), 'sumo')
    ).toEqual(['quad_dominant']);
  });

  it('deadlift + opposite stance + sumo primary (default) → ["quad_dominant"] (opposite = conventional)', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'opposite', equipment: null }))
    ).toEqual(['quad_dominant']);
  });

  it('deadlift + opposite stance + conventional primary (explicit) → ["posterior_chain"] (opposite = sumo)', () => {
    expect(
      toMovementCategory(
        ex({ type: 'deadlift', stance: 'opposite', equipment: null }),
        'conventional'
      )
    ).toEqual(['posterior_chain']);
  });

  it('deadlift + opposite stance + sumo primary → ["quad_dominant"] (opposite = conventional)', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'opposite', equipment: null }), 'sumo')
    ).toEqual(['quad_dominant']);
  });

  it('board equipment beats competition stance (parser fallback) → ROM modifier wins', () => {
    expect(toMovementCategory(ex({ stance: 'competition', equipment: 'board' }))).toEqual(['xxx']);
  });

  it('incline equipment is not a ROM modifier → competition stance still anchors', () => {
    expect(
      toMovementCategory(ex({ type: 'bench', stance: 'competition', equipment: 'incline' }))
    ).toEqual(['xxx']);
  });

  it('deadlift + deficit equipment + competition stance (parser fallback) → ROM modifier wins', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'competition', equipment: 'deficit' }))
    ).toEqual(['xxx']);
  });

  it('deadlift + blocks equipment + competition stance (parser fallback) → ROM modifier wins', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'competition', equipment: 'blocks' }))
    ).toEqual(['xxx']);
  });

  it('deficit sumo deadlift → both ROM modifier and movement pattern', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'sumo', equipment: 'deficit' }))
    ).toEqual(['xxx']);
  });

  it('pause conventional deadlift → both ROM modifier and movement pattern', () => {
    expect(
      toMovementCategory(ex({ type: 'deadlift', stance: 'conventional', equipment: 'pause' }))
    ).toEqual(['xxx']);
  });

  it('squat + zercher bar → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: null, bar: 'zercher' }))).toEqual([
      'xxx',
    ]);
  });

  it('squat + cambered bar → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: null, bar: 'cambered' }))).toEqual([
      'xxx',
    ]);
  });

  it('squat + belt bar → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: null, bar: 'belt' }))).toEqual(['xxx']);
  });

  it('squat + sumo stance → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: 'sumo' }))).toEqual(['xxx']);
  });

  it('squat + wide stance → ["xxx"]', () => {
    expect(toMovementCategory(ex({ type: 'squat', stance: 'wide' }))).toEqual(['xxx']);
  });
});

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

  it('equipment:board:bench effects contain LOCKOUT and REDUCED_ROM', () => {
    const e = __MODIFIER__EFFECTS__['equipment:board:bench'];
    expect(e.effects).toContain('LOCKOUT');
    expect(e.effects).toContain('REDUCED_ROM');
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
    movementCategory: ['anchor'],
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
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-08', 305)
      ),
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        session('2024-01-04', 280)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.type).toBe('bench');
    expect(r.displayName).toBe('board press');
    expect(r.expectedBaseline).toBe('105–115%');
    expect(['optimal', 'weakness', 'overtrained']).toContain(r.status);
    expect(r.diagnostic).toMatch(/^board press at \d+%$/);
  });

  it('board press result includes LOCKOUT and REDUCED_ROM effects', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        session('2024-01-01', 280)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results[0].effects).toContain('LOCKOUT');
    expect(results[0].effects).toContain('REDUCED_ROM');
  });

  it('emits a Weakness result when factor falls below the baseline floor', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      // board press at only 80% of anchor → below 105% floor
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        session('2024-01-01', 240)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('weakness');
  });

  it('emits an Optimal result when factor meets the baseline floor (exact boundary)', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 100)
      ),
      // floor press at exactly 85% of anchor → meets 85% floor (equipment:floor:bench = 85-95%)
      pair(
        { movementCategory: ['xxx'], displayName: 'floor press', equipment: 'floor' },
        session('2024-01-01', 85)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results[0].status).toBe('optimal');
  });

  it('floor press baseline is 85–95% (from CSV)', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        { movementCategory: ['xxx'], displayName: 'floor press', equipment: 'floor' },
        session('2024-01-01', 260)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].expectedBaseline).toBe('85–95%');
  });

  it('skips variations with sampleCount === 0 (no date overlap with anchor)', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      // Variation with reps: 0 → fitVariantFactor skips it → sampleCount 0
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        { ...session('2024-06-01', 280), reps: 0 }
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(0);
  });

  it('skips unclassified movement categories', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        { movementCategory: ['unclassified'], displayName: 'dumbbell fly' },
        session('2024-01-01', 100)
      ),
    ];
    expect(generateDiagnostics(pairs)).toHaveLength(0);
  });

  it('skips accessory exercises entirely', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { type: 'accessory', movementCategory: ['unclassified'], displayName: 'tricep pushdown' },
        session('2024-01-01', 100)
      ),
    ];
    expect(generateDiagnostics(pairs)).toHaveLength(0);
  });

  it('skips variations with no non-standard modifier to look up', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      // quad_dominant with standard bar, null stance, no equipment → no modifier key → skipped
      pair(
        { movementCategory: ['quad_dominant'], displayName: 'wide grip bench' },
        session('2024-01-01', 260)
      ),
    ];
    expect(generateDiagnostics(pairs)).toHaveLength(0);
  });

  it('opposite-stance DL with default conventional primary produces posterior_chain result (opposite = sumo)', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { type: 'deadlift', movementCategory: ['anchor'], displayName: 'deadlift' },
        session('2024-01-01', 500)
      ),
      pair(
        {
          type: 'deadlift',
          movementCategory: ['posterior_chain'],
          stance: 'opposite',
          displayName: 'deadlift (opposite)',
        },
        session('2024-01-01', 460)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('deadlift (opposite)');
  });

  it('sumo-stance DL with sumo primary produces posterior_chain result', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { type: 'deadlift', movementCategory: ['anchor'], displayName: 'deadlift' },
        session('2024-01-01', 500)
      ),
      pair(
        {
          type: 'deadlift',
          movementCategory: ['posterior_chain'],
          stance: 'sumo',
          displayName: 'deadlift (sumo)',
        },
        session('2024-01-01', 460)
      ),
    ];
    // stance:sumo:deadlift has a baseline (90–100%)
    const results = generateDiagnostics(pairs, null, 'sumo');
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('deadlift (sumo)');
    expect(results[0].effects).toContain('POSTERIOR_CHAIN');
  });

  it('emits an Overtrained result when factor exceeds the baseline ceiling', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 100)
      ),
      // floor press at 100% of anchor → above 95% ceiling (equipment:floor:bench = 85-95%)
      pair(
        { movementCategory: ['xxx'], displayName: 'floor press', equipment: 'floor' },
        session('2024-01-01', 100)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results[0].status).toBe('overtrained');
  });

  it('SSB + pause squat combines bar:ssb + equipment:pause multiplicatively (77–90%)', () => {
    const anchor: ConjugateDataPair = [
      ex({
        type: 'squat',
        bar: 'standard',
        stance: 'competition',
        displayName: 'squat',
        movementCategory: ['anchor'],
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
        movementCategory: ['xxx'],
      }),
      session('2024-01-01', 77),
    ];
    const results = generateDiagnostics([anchor, variation]);
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
        movementCategory: ['anchor'],
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
        movementCategory: ['xxx'],
      }),
      session('2024-01-01', 81),
    ];
    const results = generateDiagnostics([anchor, variation]);
    expect(results).toHaveLength(1);
    // equipment:box:squat (90–100%) × bar:ssb:squat (90–95%) = 81–95%
    expect(results[0].expectedBaseline).toBe('81–95%');
  });

  it('single-modifier baseline is unchanged (board press → 105–115%)', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        session('2024-01-01', 315)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(1);
    expect(results[0].expectedBaseline).toBe('105–115%');
  });

  it('uses bench w/commands as anchor when present, measuring other variations against it', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        {
          stance: 'competition',
          equipment: 'pause',
          movementCategory: ['xxx'],
          displayName: 'bench w/commands',
        },
        session('2024-01-01', 250)
      ),
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        session('2024-01-01', 270)
      ),
    ];
    const results = generateDiagnostics(pairs, 'bench w/commands');
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe('board press');
    expect(results[0].type).toBe('bench');
    expect(results[0].expectedBaseline).toBe('105–115%');
  });

  it('falls back to plain bench as anchor when no bench w/commands is present', () => {
    const pairs: ConjugateDataPair[] = [
      pair(
        { stance: 'competition', movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        session('2024-01-01', 270)
      ),
    ];
    const results = generateDiagnostics(pairs);
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
          movementCategory: ['anchor'],
          displayName: 'deadlift',
          addlWts: [],
        },
        session('2024-02-01', 250)
      ),
      pair(
        {
          type: 'deadlift',
          movementCategory: ['anchor'], // would be an anchor by category alone — addlWts must block it
          displayName: 'deadlift (bands)',
          addlWts: ['bands'],
        },
        session('2024-02-08', 190)
      ),
      pair(
        {
          type: 'deadlift',
          movementCategory: ['xxx'],
          displayName: 'deficit deadlift',
          equipment: 'deficit',
          addlWts: [],
        },
        session('2024-02-01', 220)
      ),
    ];
    const results = generateDiagnostics(pairs);
    const deficit = results.find((r) => r.displayName === 'deficit deadlift');
    expect(deficit).toBeDefined();
    // Anchor grid should only contain the straight-bar session (250).
    // deficit factor = 220/250 = 88% → within 85–95% → optimal
    expect(deficit!.status).toBe('optimal');
  });

  it('variations with addlWts are excluded from diagnostic results', () => {
    // Chains/bands add variable load not captured in recorded weight, so e1RM comparison
    // against the straight-bar anchor is unreliable. They must not appear in results even
    // when they have a pct-bearing key from another modifier (e.g. swiss bar, floor press).
    const pairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        {
          bar: 'swiss',
          movementCategory: ['anchor'],
          displayName: 'swiss bar bench (chain)',
          addlWts: ['chains'],
        },
        session('2024-01-01', 270)
      ),
      pair(
        {
          equipment: 'floor',
          movementCategory: ['xxx'],
          displayName: 'floor press (chain)',
          addlWts: ['chains'],
        },
        session('2024-01-01', 255)
      ),
    ];
    const results = generateDiagnostics(pairs);
    expect(results).toHaveLength(0);
  });

  it('handles multiple lifts and returns results for each', () => {
    const benchPairs: ConjugateDataPair[] = [
      pair(
        { movementCategory: ['anchor'], displayName: 'bench press' },
        session('2024-01-01', 300)
      ),
      pair(
        { movementCategory: ['xxx'], displayName: 'board press', equipment: 'board' },
        session('2024-01-01', 270)
      ),
    ];
    const deadPairs: ConjugateDataPair[] = [
      pair(
        { type: 'deadlift', movementCategory: ['anchor'], displayName: 'deadlift' },
        session('2024-01-01', 500)
      ),
      pair(
        {
          type: 'deadlift',
          movementCategory: ['xxx'],
          displayName: 'rack pull',
          equipment: 'rack',
        },
        session('2024-01-01', 460)
      ),
    ];
    const results = generateDiagnostics([...benchPairs, ...deadPairs]);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.type).sort()).toEqual(['bench', 'deadlift']);
  });
});

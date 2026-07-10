import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import {
  availableEquipmentMagnitudes,
  exercisesForLiftType,
  resolveEffectiveCanonical,
} from './repCalculatorSelectors';

const record = (
  canonical: string,
  tags: string[],
  opts: { rawExercise?: string; exercise?: string } = {}
): TaggedSetRecord => ({
  date: 0,
  weight: 100,
  reps: 5,
  rpe: undefined,
  canonical,
  exercise: opts.exercise ?? canonical,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
  meta: opts.rawExercise ? { rawExercise: opts.rawExercise } : undefined,
});

describe('availableEquipmentMagnitudes', () => {
  it.each([
    ['no equipment selected', null, [], []],
    ['equipment = null', null, [record('bench-board-2', ['equip:board-2'])], []],
    ['equipment not in allowed list', 'pause', [record('bench-pause', ['equip:pause'])], []],
    ['equipment selected, no matching records', 'board', [record('bench', ['comp-lift'])], []],
    [
      'board equipment with one magnitude',
      'board',
      [record('bench-board-1', ['equip:board-1']), record('bench-board-1', ['equip:board-1'])],
      ['1'],
    ],
    [
      'board equipment with multiple magnitudes, numeric sort',
      'board',
      [
        record('bench-board-1', ['equip:board-1']),
        record('bench-board-10', ['equip:board-10']),
        record('bench-board-2', ['equip:board-2']),
      ],
      ['1', '2', '10'],
    ],
    [
      'blocks equipment with mixed numeric/non-numeric magnitudes',
      'blocks',
      [
        record('squat-blocks-abc', ['equip:blocks-abc']),
        record('squat-blocks-1', ['equip:blocks-1']),
        record('squat-blocks-xyz', ['equip:blocks-xyz']),
      ],
      ['1', 'abc', 'xyz'],
    ],
    [
      'deficit equipment deduplicates magnitudes',
      'deficit',
      [
        record('deadlift-deficit-2', ['equip:deficit-2']),
        record('deadlift-deficit-2', ['equip:deficit-2']),
      ],
      ['2'],
    ],
  ])('%s', (_, equipment, records, expected) => {
    expect(availableEquipmentMagnitudes(records, equipment as string | null)).toEqual(expected);
  });
});

describe('exercisesForLiftType', () => {
  it.each([
    ['empty input', [], []],
    [
      'single exercise',
      [record('bench', ['lift:bench'])],
      [{ canonical: 'bench', label: 'bench' }],
    ],
    [
      'duplicate canonicals collapse to one',
      [
        record('bench', ['lift:bench']),
        record('bench', ['lift:bench']),
        record('bench', ['lift:bench']),
      ],
      [{ canonical: 'bench', label: 'bench' }],
    ],
    [
      'rawExercise used when present',
      [record('bench', ['lift:bench'], { rawExercise: 'Bench (Competition)' })],
      [{ canonical: 'bench', label: 'Bench (Competition)' }],
    ],
    [
      'multiple exercises sorted by label',
      [
        record('bench-close', ['lift:bench']),
        record('bench', ['lift:bench']),
        record('bench-board-2', ['lift:bench']),
      ],
      [
        { canonical: 'bench', label: 'bench' },
        { canonical: 'bench-board-2', label: 'bench-board-2' },
        { canonical: 'bench-close', label: 'bench-close' },
      ],
    ],
    [
      'rawExercise overrides exercise for sorting',
      [
        record('bench-1', ['lift:bench'], { rawExercise: 'Bench Variation A' }),
        record('bench-2', ['lift:bench'], { rawExercise: 'Bench Variation B' }),
      ],
      [
        { canonical: 'bench-1', label: 'Bench Variation A' },
        { canonical: 'bench-2', label: 'Bench Variation B' },
      ],
    ],
  ])('%s', (_, records, expected) => {
    expect(exercisesForLiftType(records)).toEqual(expected);
  });
});

describe('resolveEffectiveCanonical', () => {
  it.each([
    [
      'no selectedRecord returns null',
      [record('bench', ['lift:bench'])],
      {
        liftType: 'bench',
        selectedRecord: undefined,
        selectedBar: 'standard',
        selectedStance: 'competition',
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: null,
      },
      null,
    ],
    [
      'accessory lift type short-circuits to selectedRecord.canonical',
      [record('leg-press', ['lift:accessory'])],
      {
        liftType: 'accessory',
        selectedRecord: record('leg-press', ['lift:accessory']),
        selectedBar: null,
        selectedStance: null,
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: null,
      },
      'leg-press',
    ],
    [
      'candidate-key exact match',
      [
        record('bench-close', ['bar:close', 'stance:competition']),
        record('bench-standard', ['bar:standard', 'stance:competition']),
      ],
      {
        liftType: 'bench',
        selectedRecord: record('bench-standard', ['bar:standard', 'stance:competition']),
        selectedBar: 'standard',
        selectedStance: 'competition',
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: null,
      },
      'bench-standard',
    ],
    [
      'facet-field fallback match when key does not match',
      [
        record('bench-close', ['bar:close', 'stance:narrow']),
        record('bench-standard', ['bar:standard', 'stance:competition']),
      ],
      {
        liftType: 'bench',
        selectedRecord: record('bench-standard', ['bar:standard', 'stance:competition']),
        selectedBar: 'standard',
        selectedStance: 'competition',
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: null,
      },
      'bench-standard',
    ],
    [
      'addlWt present filters to matching record only',
      [record('bench-chains', ['addl:chains']), record('bench', ['comp-lift'])],
      {
        liftType: 'bench',
        selectedRecord: record('bench-chains', ['addl:chains']),
        selectedBar: 'standard',
        selectedStance: 'competition',
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: 'chains',
      },
      'bench-chains',
    ],
    [
      'addlWt absent filters to record with empty addlWts',
      [record('bench-chains', ['addl:chains']), record('bench', ['comp-lift'])],
      {
        liftType: 'bench',
        selectedRecord: record('bench', ['comp-lift']),
        selectedBar: 'standard',
        selectedStance: 'competition',
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: null,
      },
      'bench',
    ],
    [
      'no match returns selectedRecord.canonical fallback',
      [record('bench-close', ['bar:close', 'stance:narrow'])],
      {
        liftType: 'bench',
        selectedRecord: record('bench-standard', ['bar:standard', 'stance:competition']),
        selectedBar: 'standard',
        selectedStance: 'competition',
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: null,
      },
      'bench-standard',
    ],
    [
      'equipment magnitude included in facet-field fallback match',
      [record('bench-board-2', ['equip:board-2']), record('bench', ['comp-lift'])],
      {
        liftType: 'bench',
        selectedRecord: record('bench-board-2', ['equip:board-2']),
        selectedBar: 'standard',
        selectedStance: 'competition',
        selectedEquipment: 'board',
        selectedEquipmentMagnitude: '2',
        selectedAddlWt: null,
      },
      'bench-board-2',
    ],
    [
      'stance = competition excluded from candidateKey',
      [
        record('bench-close', ['bar:close', 'stance:competition']),
        record('bench-standard', ['bar:standard', 'stance:competition']),
      ],
      {
        liftType: 'bench',
        selectedRecord: record('bench-close', ['bar:close', 'stance:competition']),
        selectedBar: 'close',
        selectedStance: 'competition',
        selectedEquipment: null,
        selectedEquipmentMagnitude: null,
        selectedAddlWt: null,
      },
      'bench-close',
    ],
  ])(
    '%s',
    (
      _,
      records,
      params: {
        liftType: string;
        selectedRecord: TaggedSetRecord | undefined;
        selectedBar: string | null;
        selectedStance: string | null;
        selectedEquipment: string | null;
        selectedEquipmentMagnitude: string | null;
        selectedAddlWt: string | null;
      },
      expected
    ) => {
      expect(resolveEffectiveCanonical(records, params)).toBe(expected);
    }
  );
});

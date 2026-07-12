import { describe, it, expect } from 'vitest';
import type { TaggedSetRecord } from '@dyel/pipeline';
import {
  availableEquipmentMagnitudes,
  exercisesForLiftType,
  resolveEffectiveCanonical,
} from './repCalculatorSelectors';

// Automatically infer the precise type from the function signature's second argument
type ParamsType = Parameters<typeof resolveEffectiveCanonical>[1];

const rec = (
  canonical: string,
  tags: string[],
  opts?: { rawExercise?: string; exercise?: string }
): TaggedSetRecord => ({
  date: 0,
  weight: 100,
  reps: 5,
  rpe: undefined,
  canonical,
  exercise: opts?.exercise ?? canonical,
  tags: new Set(tags),
  effects: [],
  baselineRange: null,
  meta: opts?.rawExercise ? { rawExercise: opts.rawExercise } : undefined,
});

describe('availableEquipmentMagnitudes', () => {
  it.each([
    ['no equipment Selected', null, [], []],
    ['equipment null', null, [rec('b-board-2', ['equip:board-2'])], []],
    ['unallowed equipment', 'pause', [rec('b-pause', ['equip:pause'])], []],
    ['no records matching', 'board', [rec('b', ['comp-lift'])], []],
    [
      'one magnitude',
      'board',
      [rec('b-board-1', ['equip:board-1']), rec('b-board-1', ['equip:board-1'])],
      ['1'],
    ],
    [
      'numeric sorting pass',
      'board',
      [
        rec('b-board-1', ['equip:board-1']),
        rec('b-board-10', ['equip:board-10']),
        rec('b-board-2', ['equip:board-2']),
      ],
      ['1', '2', '10'],
    ],
    [
      'mixed text / numeric sort',
      'blocks',
      [
        rec('s-blocks-abc', ['equip:blocks-abc']),
        rec('s-blocks-1', ['equip:blocks-1']),
        rec('s-blocks-xyz', ['equip:blocks-xyz']),
      ],
      ['1', 'abc', 'xyz'],
    ],
    [
      'deduplicates values',
      'deficit',
      [rec('d-deficit-2', ['equip:deficit-2']), rec('d-deficit-2', ['equip:deficit-2'])],
      ['2'],
    ],
  ])('%s', (_, equip, records, expected) => {
    expect(availableEquipmentMagnitudes(records, equip)).toEqual(expected);
  });
});

describe('exercisesForLiftType', () => {
  it.each([
    ['empty input', [], []],
    ['single exercise', [rec('bench', ['lift:bench'])], [{ canonical: 'bench', label: 'bench' }]],
    [
      'collapses duplicate canonicals',
      [rec('bench', ['lift:bench']), rec('bench', ['lift:bench'])],
      [{ canonical: 'bench', label: 'bench' }],
    ],
    [
      'uses rawExercise label override',
      [rec('bench', ['lift:bench'], { rawExercise: 'Bench (Comp)' })],
      [{ canonical: 'bench', label: 'Bench (Comp)' }],
    ],
    [
      'sorts exercises by label',
      [
        rec('bench-close', ['lift:bench']),
        rec('bench', ['lift:bench']),
        rec('bench-board-2', ['lift:bench']),
      ],
      [
        { canonical: 'bench', label: 'bench' },
        { canonical: 'bench-board-2', label: 'bench-board-2' },
        { canonical: 'bench-close', label: 'bench-close' },
      ],
    ],
    [
      'sorts by overriding rawExercise',
      [
        rec('bench-1', ['lift:bench'], { rawExercise: 'Var A' }),
        rec('bench-2', ['lift:bench'], { rawExercise: 'Var B' }),
      ],
      [
        { canonical: 'bench-1', label: 'Var A' },
        { canonical: 'bench-2', label: 'Var B' },
      ],
    ],
  ])('%s', (_, records, expected) => {
    expect(exercisesForLiftType(records)).toEqual(expected);
  });
});

describe('resolveEffectiveCanonical', () => {
  const bComp = rec('bench', ['bar:standard', 'stance:competition']);
  const baseParams: ParamsType = {
    liftType: 'bench',
    selectedRecord: bComp,
    selectedBar: 'standard',
    selectedStance: 'competition',
    selectedEquipment: null,
    selectedEquipmentMagnitude: null,
    selectedAddlWt: null,
  };

  it.each([
    [
      'no selectedRecord returns null',
      [rec('bench', ['lift:bench'])],
      { ...baseParams, selectedRecord: undefined },
      null,
    ],
    [
      'accessory short-circuits',
      [rec('leg-press', ['lift:accessory'])],
      {
        ...baseParams,
        liftType: 'accessory',
        selectedRecord: rec('leg-press', ['lift:accessory']),
        selectedBar: null,
        selectedStance: null,
      },
      'leg-press',
    ],
    [
      'candidate-key exact match',
      [
        rec('bench-close', ['bar:close', 'stance:competition']),
        rec('bench-std', ['bar:standard', 'stance:competition']),
      ],
      { ...baseParams, selectedRecord: rec('bench-std', ['bar:standard', 'stance:competition']) },
      'bench-std',
    ],
    [
      'facet-field fallback match',
      [
        rec('bench-close', ['bar:close', 'stance:narrow']),
        rec('bench-std', ['bar:standard', 'stance:competition']),
      ],
      baseParams,
      'bench-std',
    ],
    [
      'filters matching addlWt',
      [rec('bench-chains', ['addl:chains']), rec('bench', ['comp-lift'])],
      {
        ...baseParams,
        selectedRecord: rec('bench-chains', ['addl:chains']),
        selectedAddlWt: 'chains',
      },
      'bench-chains',
    ],
    [
      'filters empty addlWt',
      [rec('bench-chains', ['addl:chains']), rec('bench', ['comp-lift'])],
      { ...baseParams, selectedRecord: rec('bench', ['comp-lift']) },
      'bench',
    ],
    [
      'no match fallback',
      [rec('bench-close', ['bar:close', 'stance:narrow'])],
      { ...baseParams, selectedRecord: rec('bench-std', ['bar:standard', 'stance:competition']) },
      'bench-standard',
    ],
    [
      'includes equipment magnitude match',
      [rec('bench-board-2', ['equip:board-2']), rec('bench', ['comp-lift'])],
      {
        ...baseParams,
        selectedRecord: rec('bench-board-2', ['equip:board-2']),
        selectedEquipment: 'board',
        selectedEquipmentMagnitude: '2',
      },
      'bench-board-2',
    ],
    [
      'excludes competition stance from key',
      [
        rec('bench-close', ['bar:close', 'stance:competition']),
        rec('bench-std', ['bar:standard', 'stance:competition']),
      ],
      {
        ...baseParams,
        selectedRecord: rec('bench-close', ['bar:close', 'stance:competition']),
        selectedBar: 'close',
      },
      'bench-close',
    ],
  ])('%s', (_, records, params, expected) => {
    expect(resolveEffectiveCanonical(records, params)).toBe(expected);
  });
});

import { describe, it, expect } from 'vitest';
import { buildExerciseDisplayNameIndex, formatExerciseDisplayName } from './exerciseUtils';

describe('formatExerciseDisplayName', () => {
  it.each([
    ['required: squat-bands-heavy', 'squat-bands-heavy', 'Squat w/heavy bands'],
    ['required: bench-board-2', 'bench-board-2', '2-Board Bench Press'],
    ['required: deadlift-deficit-2', 'deadlift-deficit-2', '2" Deficit Deadlift'],
    ['bar: ssb', 'squat-ssb', 'SSB Squat'],
    ['bar: american', 'squat-american', 'American Bar Squat'],
    ['bar: swiss', 'squat-swiss', 'Swiss Bar Squat'],
    ['bar: cambered', 'squat-cambered', 'Cambered Bar Squat'],
    ['bar: standard (no prefix)', 'squat-standard', 'Squat'],
    ['bar: trap', 'squat-trap', 'Trap Bar Squat'],
    ['bar: zercher', 'squat-zercher', 'Zercher Squat'],
    ['bar: duffalo', 'squat-duffalo', 'Duffalo Bar Squat'],
    ['bar: dumbbell', 'squat-dumbbell', 'Dumbbell Squat'],
    ['bar: bamboo', 'squat-bamboo', 'Bamboo Bar Squat'],
    ['bar: belt', 'squat-belt', 'Belt Squat'],
    ['bar: goblet', 'squat-goblet', 'Goblet Squat'],
    ['stance: close', 'deadlift-close', 'Close Deadlift'],
    ['stance: narrow', 'deadlift-narrow', 'Narrow Deadlift'],
    ['stance: sumo', 'deadlift-sumo', 'Sumo Deadlift'],
    ['stance: conventional', 'deadlift-conventional', 'Conventional Deadlift'],
    ['stance: competition (no prefix)', 'deadlift-competition', 'Deadlift'],
    ['stance: front', 'deadlift-front', 'Front Deadlift'],
    ['stance: opposite', 'deadlift-opposite', 'Opposite Deadlift'],
    ['stance: medium', 'deadlift-medium', 'Medium Deadlift'],
    ['stance: wide', 'deadlift-wide', 'Wide Deadlift'],
    ['stance: romanian', 'deadlift-romanian', 'Romanian Deadlift'],
    ['stance: slingshot', 'deadlift-slingshot', 'Slingshot Deadlift'],
    ['stance: builder', 'deadlift-builder', 'Builder Deadlift'],
    ['equipment: incline', 'bench-incline', 'Incline Bench Press'],
    ['equipment: decline', 'bench-decline', 'Decline Bench Press'],
    ['equipment: pause', 'bench-pause', 'Pause Bench Press'],
    ['equipment: floor', 'bench-floor', 'Floor Bench Press'],
    ['equipment: box', 'bench-box', 'Box Bench Press'],
    ['equipment: rack', 'bench-rack', 'Rack Bench Press'],
    ['board no magnitude', 'bench-board', '1-Board Bench Press'],
    ['board with magnitude 3', 'bench-board-3', '3-Board Bench Press'],
    ['blocks no magnitude', 'squat-blocks', '1" Blocks Squat'],
    ['blocks with magnitude 4', 'squat-blocks-4', '4" Blocks Squat'],
    ['deficit no magnitude', 'deadlift-deficit', '1" Deficit Deadlift'],
    ['deficit with magnitude 2', 'deadlift-deficit-2', '2" Deficit Deadlift'],
    ['bands: light', 'squat-bands-light', 'Squat w/light bands'],
    ['bands: mini', 'squat-bands-mini', 'Squat w/mini bands'],
    ['bands: micro', 'squat-bands-micro', 'Squat w/micro bands'],
    ['bands: heavy', 'squat-bands-heavy', 'Squat w/heavy bands'],
    ['bands: medium', 'squat-bands-medium', 'Squat w/medium bands'],
    ['bands: unspecified (no magnitude)', 'squat-bands-unspecified', 'Squat w/bands'],
    ['rev-bands: light', 'squat-rev-bands-light', 'Squat w/light reverse bands'],
    ['rev-bands: mini', 'squat-rev-bands-mini', 'Squat w/mini reverse bands'],
    ['rev-bands: micro', 'squat-rev-bands-micro', 'Squat w/micro reverse bands'],
    ['rev-bands: heavy', 'squat-rev-bands-heavy', 'Squat w/heavy reverse bands'],
    ['rev-bands: medium', 'squat-rev-bands-medium', 'Squat w/medium reverse bands'],
    [
      'rev-bands: unspecified (no magnitude)',
      'squat-rev-bands-unspecified',
      'Squat w/reverse bands',
    ],
    ['chains bare', 'squat-chains', 'Squat w/chains'],
    ['chains with magnitude 3', 'squat-chains-3', 'Squat w/3 chains'],
    [
      'combined: bar+stance+equipment+addlwt',
      'squat-ssb-sumo-box-bands-heavy',
      'SSB Sumo Box Squat w/heavy bands',
    ],
    ['multi-addlwt', 'squat-chains-3-bands-heavy', 'Squat w/3 chains + heavy bands'],
    ['accessory: bulgarian-split-squat', 'bulgarian-split-squat', 'Bulgarian Split Squat'],
    ['unknown first token: foobar-widget', 'foobar-widget', 'Foobar Widget'],
    ['empty string', '', ''],
  ])('%s', (_, canonical, expected) => {
    expect(formatExerciseDisplayName(canonical)).toBe(expected);
  });
});

describe('buildExerciseDisplayNameIndex', () => {
  it.each([
    ['empty input', [], []],
    ['single canonical', ['bench'], [{ canonical: 'bench', displayName: 'Bench Press' }]],
    [
      'dedup: same canonical twice',
      ['bench', 'bench'],
      [{ canonical: 'bench', displayName: 'Bench Press' }],
    ],
    [
      'sort: multiple distinct canonicals by displayName',
      ['deadlift', 'bench', 'squat'],
      [
        { canonical: 'bench', displayName: 'Bench Press' },
        { canonical: 'deadlift', displayName: 'Deadlift' },
        { canonical: 'squat', displayName: 'Squat' },
      ],
    ],
    [
      'dedup and sort combined',
      ['squat', 'bench', 'bench', 'deadlift', 'squat'],
      [
        { canonical: 'bench', displayName: 'Bench Press' },
        { canonical: 'deadlift', displayName: 'Deadlift' },
        { canonical: 'squat', displayName: 'Squat' },
      ],
    ],
    [
      'correctness: board variant',
      ['bench-board-2'],
      [{ canonical: 'bench-board-2', displayName: '2-Board Bench Press' }],
    ],
    [
      'correctness: mixed standard and variant',
      ['deadlift', 'bench-board-2', 'squat'],
      [
        { canonical: 'bench-board-2', displayName: '2-Board Bench Press' },
        { canonical: 'deadlift', displayName: 'Deadlift' },
        { canonical: 'squat', displayName: 'Squat' },
      ],
    ],
  ])('%s', (_, canonicals, expected) => {
    expect(buildExerciseDisplayNameIndex(canonicals)).toEqual(expected);
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildExerciseDisplayNameIndex,
  canonicalLiftType,
  formatExerciseDisplayName,
} from './exerciseUtils';

const TESTS = [
  ['squat-bands-heavy', 'Squat w/heavy bands'],
  ['bench-board-2', '2-Board Bench Press'],
  ['deadlift-deficit-2', '4" Deficit Deadlift'],
  ['squat-ssb', 'SSB Squat'],
  ['squat-american', 'American Bar Squat'],
  ['squat-swiss', 'Swiss Bar Squat'],
  ['squat-cambered', 'Cambered Bar Squat'],
  ['squat-standard', 'Squat'],
  ['squat-trap', 'Trap Bar Squat'],
  ['squat-zercher', 'Zercher Squat'],
  ['squat-duffalo', 'Duffalo Bar Squat'],
  ['squat-dumbbell', 'Dumbbell Squat'],
  ['squat-bamboo', 'Bamboo Bar Squat'],
  ['squat-belt', 'Belt Squat'],
  ['squat-goblet', 'Goblet Squat'],
  ['deadlift-close', 'Close Deadlift'],
  ['deadlift-narrow', 'Narrow Deadlift'],
  ['deadlift-sumo', 'Sumo Deadlift'],
  ['deadlift-conventional', 'Conventional Deadlift'],
  ['deadlift-front', 'Front Deadlift'],
  ['squat-lowbar', 'Low Bar Squat'],
  ['deadlift-medium', 'Medium Deadlift'],
  ['deadlift-wide', 'Wide Deadlift'],
  ['deadlift-romanian', 'Romanian Deadlift'],
  ['deadlift-slingshot', 'Slingshot Deadlift'],
  ['deadlift-builder', 'Builder Deadlift'],
  ['bench-incline', 'Incline Bench Press'],
  ['bench-decline', 'Decline Bench Press'],
  ['bench-pause', 'Pause Bench Press'],
  ['bench-floor', 'Floor Bench Press'],
  ['bench-box', 'Box Bench Press'],
  ['bench-rack', 'Rack Bench Press'],
  ['bench-board', '1-Board Bench Press'],
  ['bench-board-3', '3-Board Bench Press'],
  ['squat-blocks', '2" Block Squat'],
  ['squat-blocks-4', '8" Block Squat'],
  ['deadlift-deficit', '2" Deficit Deadlift'],
  ['squat-bands-light', 'Squat w/light bands'],
  ['squat-bands-mini', 'Squat w/mini bands'],
  ['squat-bands-micro', 'Squat w/micro bands'],
  ['squat-bands-medium', 'Squat w/medium bands'],
  ['squat-bands-unspecified', 'Squat w/bands'],
  ['squat-rev-bands-light', 'Squat w/light reverse bands'],
  ['squat-rev-bands-mini', 'Squat w/mini reverse bands'],
  ['squat-rev-bands-micro', 'Squat w/micro reverse bands'],
  ['squat-rev-bands-heavy', 'Squat w/heavy reverse bands'],
  ['squat-rev-bands-medium', 'Squat w/medium reverse bands'],
  ['squat-rev-bands-unspecified', 'Squat w/reverse bands'],
  ['squat-chains', 'Squat w/chains'],
  ['squat-chains-3', 'Squat w/3 chains'],
  ['squat-ssb-sumo-box-bands-heavy', 'SSB Sumo Box Squat w/heavy bands'],
  ['squat-chains-3-bands-heavy', 'Squat w/3 chains + heavy bands'],
  ['bulgarian-split-squat', 'Bulgarian Split Squat'],
  ['foobar-widget', 'Foobar Widget'],
  ['', ''],
];

describe('formatExerciseDisplayName', () => {
  it.each(TESTS)('formats "%s" -> "%s"', (canonical, expected) => {
    expect(formatExerciseDisplayName(canonical)).toBe(expected);
  });
});

describe('buildExerciseDisplayNameIndex', () => {
  it.each([
    ['empty input', [], []],
    [
      'single canonical',
      ['bench'],
      [{ canonical: 'bench', displayName: 'Bench Press', liftType: 'bench' }],
    ],
    [
      'dedup',
      ['bench', 'bench'],
      [{ canonical: 'bench', displayName: 'Bench Press', liftType: 'bench' }],
    ],
    [
      'sort by display name',
      ['deadlift', 'bench', 'squat'],
      [
        { canonical: 'bench', displayName: 'Bench Press', liftType: 'bench' },
        { canonical: 'deadlift', displayName: 'Deadlift', liftType: 'deadlift' },
        { canonical: 'squat', displayName: 'Squat', liftType: 'squat' },
      ],
    ],
    [
      'combined flow',
      ['squat', 'bench', 'bench', 'deadlift', 'squat'],
      [
        { canonical: 'bench', displayName: 'Bench Press', liftType: 'bench' },
        { canonical: 'deadlift', displayName: 'Deadlift', liftType: 'deadlift' },
        { canonical: 'squat', displayName: 'Squat', liftType: 'squat' },
      ],
    ],
    [
      'board variant',
      ['bench-board-2'],
      [{ canonical: 'bench-board-2', displayName: '2-Board Bench Press', liftType: 'bench' }],
    ],
    [
      'mixed list',
      ['deadlift', 'bench-board-2', 'squat'],
      [
        { canonical: 'bench-board-2', displayName: '2-Board Bench Press', liftType: 'bench' },
        { canonical: 'deadlift', displayName: 'Deadlift', liftType: 'deadlift' },
        { canonical: 'squat', displayName: 'Squat', liftType: 'squat' },
      ],
    ],
  ])('%s', (_, canonicals, expected) => {
    expect(buildExerciseDisplayNameIndex(canonicals)).toEqual(expected);
  });
});

describe('canonicalLiftType', () => {
  it.each([
    ['squat canonical', 'squat-ssb-close', 'squat'],
    ['bench canonical', 'bench-board-2', 'bench'],
    ['deadlift canonical', 'deadlift-sumo', 'deadlift'],
    ['non-lift canonical falls back to accessory', 'bicep-curl', 'accessory'],
    ['empty string falls back to accessory', '', 'accessory'],
  ])('%s', (_, canonical, expected) => {
    expect(canonicalLiftType(canonical)).toBe(expected);
  });
});

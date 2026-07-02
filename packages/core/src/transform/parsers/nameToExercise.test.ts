import { describe, expect, it } from 'vitest';
import { nameToExercise } from './nameToExercise';
import type { ConjugateExercise } from '../../types/conjugate';

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

describe('nameToExercise', () => {
  describe('squat', () => {
    it('parses plain Squat', () => {
      expect(nameToExercise('Squat')).toEqual(
        ex({
          type: 'squat',
          bar: 'standard',
          stance: 'competition',
          displayName: 'Squat',
        })
      );
    });

    it('parses Box Squat', () => {
      expect(nameToExercise('Box Squat')).toMatchObject({
        type: 'squat',
        bar: 'standard',
        equipment: 'box',
        addlWts: [],
      });
    });

    it('parses Squat (SSB)', () => {
      expect(nameToExercise('Squat (SSB)')).toMatchObject({
        type: 'squat',
        bar: 'ssb',
        equipment: null,
      });
    });

    it('is case-insensitive', () => {
      expect(nameToExercise('box SQUAT')).toMatchObject({
        type: 'squat',
        bar: 'standard',
        equipment: 'box',
      });
    });
  });

  describe('bench', () => {
    it('parses plain Bench', () => {
      expect(nameToExercise('Bench')).toEqual(
        ex({
          type: 'bench',
          bar: 'standard',
          stance: 'competition',
          displayName: 'Bench',
        })
      );
    });

    it('parses Bench (American Bar)', () => {
      expect(nameToExercise('Bench (American Bar)')).toMatchObject({
        type: 'bench',
        bar: 'american',
      });
    });

    it('parses Bench (American Bar, CG)', () => {
      expect(nameToExercise('Bench (American Bar, CG)')).toMatchObject({
        type: 'bench',
        bar: 'american',
        stance: 'close',
      });
    });

    it('parses Bench (CG)', () => {
      expect(nameToExercise('Bench (CG)')).toMatchObject({
        type: 'bench',
        stance: 'close',
      });
    });

    it('parses Bench (Swiss Bar, Chain)', () => {
      expect(nameToExercise('Bench (Swiss Bar, Chain)')).toMatchObject({
        type: 'bench',
        bar: 'swiss',
        addlWts: ['chains'],
      });
    });

    it('parses Duffalo Bar Bench Press', () => {
      expect(nameToExercise('Duffalo Bar Bench Press')).toMatchObject({
        type: 'bench',
        bar: 'duffalo',
      });
    });

    it('parses Duffalo Bar Bench Press (chain)', () => {
      expect(nameToExercise('Duffalo Bar Bench Press (chain)')).toMatchObject({
        type: 'bench',
        bar: 'duffalo',
        addlWts: ['chains'],
      });
    });

    it('parses Bench (bands)', () => {
      expect(nameToExercise('Bench (bands)')).toMatchObject({
        type: 'bench',
        addlWts: ['bands'],
      });
    });

    it('parses Bench (slingshot, chain)', () => {
      expect(nameToExercise('Bench (slingshot, chain)')).toMatchObject({
        type: 'bench',
        stance: 'slingshot',
        addlWts: ['chains'],
      });
    });

    it('parses Bench (2 Board)', () => {
      expect(nameToExercise('Bench (2 Board)')).toMatchObject({
        type: 'bench',
        equipment: 'board',
      });
    });

    it('parses Bench (Dumbbell) as accessory', () => {
      expect(nameToExercise('Bench (Dumbbell)')).toMatchObject({
        type: 'accessory',
      });
    });

    it('parses Bench (Dumbbell, Decline) as accessory', () => {
      expect(nameToExercise('Bench (Dumbbell, Decline)')).toMatchObject({
        type: 'accessory',
      });
    });

    it('parses Incline Bench', () => {
      expect(nameToExercise('Incline Bench')).toMatchObject({
        type: 'bench',
        equipment: 'incline',
      });
    });

    it('parses Floor Press', () => {
      expect(nameToExercise('Floor Press')).toMatchObject({
        type: 'bench',
        equipment: 'floor',
      });
    });

    it('parses Floor Press (chain)', () => {
      expect(nameToExercise('Floor Press (chain)')).toMatchObject({
        type: 'bench',
        equipment: 'floor',
        addlWts: ['chains'],
      });
    });

    it('parses Bench Press (floor) with floor equipment so it matches Floor Press family key', () => {
      expect(nameToExercise('Bench Press (floor)')).toMatchObject({
        type: 'bench',
        equipment: 'floor',
        addlWts: [],
      });
    });

    it('parses Bench Builder as standard bar', () => {
      expect(nameToExercise('Bench Builder')).toMatchObject({
        type: 'bench',
        bar: 'standard',
        stance: 'builder',
      });
    });

    it('parses Bench (Commands) as pause equipment', () => {
      expect(nameToExercise('Bench (Commands)')).toMatchObject({
        type: 'bench',
        equipment: 'pause',
      });
    });

    it('is case-insensitive for bar names', () => {
      expect(nameToExercise('bench (SWISS BAR)')).toMatchObject({
        type: 'bench',
        bar: 'swiss',
      });
    });
  });

  describe('deadlift', () => {
    it('parses plain Deadlift', () => {
      expect(nameToExercise('Deadlift')).toEqual(
        ex({
          type: 'deadlift',
          bar: 'standard',
          stance: 'competition',
          displayName: 'Deadlift',
        })
      );
    });

    it('parses Deadlift (opposite)', () => {
      expect(nameToExercise('Deadlift (opposite)')).toMatchObject({
        type: 'deadlift',
        stance: 'opposite',
      });
    });

    it('parses Deadlift (sumo)', () => {
      expect(nameToExercise('Deadlift (sumo)')).toMatchObject({
        type: 'deadlift',
        stance: 'sumo',
      });
    });

    it('parses Deadlift (conventional)', () => {
      expect(nameToExercise('Deadlift (conventional)')).toMatchObject({
        type: 'deadlift',
        stance: 'conventional',
      });
    });

    it('parses Deadlift (romanian)', () => {
      expect(nameToExercise('Deadlift (romanian)')).toMatchObject({
        type: 'deadlift',
        stance: 'romanian',
      });
    });

    it('parses Trap Bar Deadlift', () => {
      expect(nameToExercise('Trap Bar Deadlift')).toMatchObject({
        type: 'deadlift',
        bar: 'trap',
        stance: 'competition',
      });
    });

    it('parses Deadlift (trap bar)', () => {
      expect(nameToExercise('Deadlift (trap bar)')).toMatchObject({
        type: 'deadlift',
        bar: 'trap',
        stance: 'competition',
      });
    });

    it('parses Deadlift (2" Deficit)', () => {
      expect(nameToExercise('Deadlift (2" Deficit)')).toMatchObject({
        type: 'deadlift',
        equipment: 'deficit',
      });
    });

    it('parses Deadlift (2" Block)', () => {
      expect(nameToExercise('Deadlift (2" Block)')).toMatchObject({
        type: 'deadlift',
        equipment: 'blocks',
      });
    });

    it('parses Deadlift (bands)', () => {
      expect(nameToExercise('Deadlift (bands)')).toMatchObject({
        type: 'deadlift',
        addlWts: ['bands'],
      });
    });

    it('parses Deadlift (reverse bands) as rev. bands, not bands', () => {
      expect(nameToExercise('Deadlift (reverse bands)')).toMatchObject({
        type: 'deadlift',
        addlWts: ['rev. bands'],
      });
    });
  });

  describe('dumbbell exercises', () => {
    it('classifies Dumbbell Press as accessory', () => {
      expect(nameToExercise('Dumbbell Press')).toMatchObject({ type: 'accessory' });
    });

    it('classifies Dumbbell Bench Press as accessory even though it contains bench', () => {
      expect(nameToExercise('Dumbbell Bench Press')).toMatchObject({ type: 'accessory' });
    });

    it('classifies DB RDL (token) as accessory', () => {
      expect(nameToExercise('DB RDL')).toMatchObject({ type: 'accessory' });
    });
  });

  describe('accessory exercises', () => {
    it('classifies Lat Pulldown as accessory', () => {
      expect(nameToExercise('Lat Pulldown')).toEqual(
        ex({
          type: 'accessory',
          bar: null,
          stance: null,
          displayName: 'Lat Pulldown',
        })
      );
    });

    it('classifies Overhead Press as accessory', () => {
      expect(nameToExercise('Overhead Press')).toEqual(
        ex({
          type: 'accessory',
          bar: null,
          stance: null,
          displayName: 'Overhead Press',
        })
      );
    });
  });
});

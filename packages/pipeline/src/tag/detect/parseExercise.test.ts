import { describe, it, expect } from 'vitest';
import { parseExercise } from './parseExercise';

describe('parseExercise blocks magnitude parsing', () => {
  it.each([
    [
      'plain block count (no inch mark)',
      '3 blocks deadlift',
      { equipment: 'blocks', equipmentMagnitude: '3' },
    ],
    [
      'inch-marked blocks (2 inches = 1 block)',
      '2" blocks deadlift',
      { equipment: 'blocks', equipmentMagnitude: '1' },
    ],
    [
      'inch-marked blocks (4 inches = 2 blocks)',
      '4" blocks deadlift',
      { equipment: 'blocks', equipmentMagnitude: '2' },
    ],
    [
      'inch-marked blocks with space (2 inches = 1 block)',
      '2 " block deadlift',
      { equipment: 'blocks', equipmentMagnitude: '1' },
    ],
    [
      'inch-marked blocks with space (4 inches = 2 blocks)',
      '4 " blocks deadlift',
      { equipment: 'blocks', equipmentMagnitude: '2' },
    ],
    [
      'singular block with inch mark',
      '2" block deadlift',
      { equipment: 'blocks', equipmentMagnitude: '1' },
    ],
    [
      'default magnitude when no digit',
      'blocks deadlift',
      { equipment: 'blocks', equipmentMagnitude: '1' },
    ],
  ])(
    'converts %s correctly',
    (_, input: string, expected: { equipment: string; equipmentMagnitude: string }) => {
      const result = parseExercise(input);
      expect(result.equipment).toBe(expected.equipment);
      expect(result.equipmentMagnitude).toBe(expected.equipmentMagnitude);
    }
  );
});

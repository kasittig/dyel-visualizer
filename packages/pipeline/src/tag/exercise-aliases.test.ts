import { describe, it, expect } from 'vitest';
import exerciseAliases from './exercise-aliases.json';
import exerciseMap from './exercise-map.json';

describe('exercise-aliases.json', () => {
  it('conforms to ExerciseAliasMap shape', () => {
    expect(exerciseAliases).toBeDefined();
    expect(typeof exerciseAliases).toBe('object');

    Object.entries(exerciseAliases).forEach(([rawName, canonical]) => {
      expect(typeof rawName).toBe('string');
      expect(typeof canonical).toBe('string');
    });
  });

  it('every alias resolves to a canonical present in exercise-map.json', () => {
    Object.entries(exerciseAliases).forEach(([rawName, canonical]) => {
      expect(Object.prototype.hasOwnProperty.call(exerciseMap, canonical)).toBe(
        true,
        `alias "${rawName}" points to unknown canonical "${canonical}"`
      );
    });
  });

  it('every canonical is reachable from at least one alias', () => {
    const reachable = new Set(Object.values(exerciseAliases));
    Object.keys(exerciseMap).forEach((canonical) => {
      expect(reachable.has(canonical)).toBe(
        true,
        `canonical "${canonical}" has no alias pointing to it`
      );
    });
  });

  it('covers raw names from fixture: near-variant-exercise-names', () => {
    const fixtureNames = ['Bench', 'bench press', 'Comp Bench'];
    fixtureNames.forEach((name) => {
      expect(Object.prototype.hasOwnProperty.call(exerciseAliases, name)).toBe(
        true,
        `exercise-aliases.json must include raw name: ${name}`
      );
    });
  });

  it('covers raw names from other fixtures', () => {
    const fixtureNames = ['Squat', 'Deadlift'];
    fixtureNames.forEach((name) => {
      expect(Object.prototype.hasOwnProperty.call(exerciseAliases, name)).toBe(
        true,
        `exercise-aliases.json must include raw name: ${name}`
      );
    });
  });
});

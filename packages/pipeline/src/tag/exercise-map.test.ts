import { describe, it, expect } from 'vitest';
import exerciseMap from './exercise-map.json';

describe('exercise-map.json', () => {
  it('conforms to ExerciseTagMap shape', () => {
    expect(exerciseMap).toBeDefined();
    expect(typeof exerciseMap).toBe('object');

    Object.entries(exerciseMap).forEach(([canonical, entry]) => {
      expect(typeof canonical).toBe('string');
      expect(entry).toHaveProperty('tags');
      expect(Array.isArray(entry.tags)).toBe(true);
      if (entry.effects) {
        expect(Array.isArray(entry.effects)).toBe(true);
        entry.effects.forEach((effect) => {
          expect(typeof effect).toBe('string');
        });
      }
    });
  });

  it('every entry has exactly one lift:* tag', () => {
    Object.entries(exerciseMap).forEach(([canonical, entry]) => {
      const liftTags = entry.tags.filter((tag) => tag.startsWith('lift:'));
      expect(liftTags.length).toBe(
        1,
        `${canonical} should have exactly one lift:* tag, found: ${liftTags.join(', ')}`
      );
    });
  });

  it('uses only allowed namespaces', () => {
    const allowedNamespaces = ['lift:', 'bar:', 'stance:', 'addl:', 'equip:'];
    const allowedBare = ['comp-lift', 'variation'];

    Object.entries(exerciseMap).forEach(([canonical, entry]) => {
      entry.tags.forEach((tag) => {
        const hasNamespace = allowedNamespaces.some((ns) => tag.startsWith(ns));
        const isBare = allowedBare.includes(tag);

        expect(hasNamespace || isBare).toBe(true, `${canonical} has invalid tag: ${tag}`);
      });
    });
  });

  it('includes at least one true variant with addl: tag', () => {
    const variants = Object.entries(exerciseMap).filter(([, entry]) =>
      entry.tags.some((tag) => tag.startsWith('addl:'))
    );
    expect(variants.length).toBeGreaterThan(0, 'At least one variant with addl: tag required');
  });

  it('includes at least one bar variant with bar: tag', () => {
    const variants = Object.entries(exerciseMap).filter(([, entry]) =>
      entry.tags.some((tag) => tag.startsWith('bar:'))
    );
    expect(variants.length).toBeGreaterThan(0, 'At least one bar variant with bar: tag required');
  });

  it('tags the three competition lifts with comp-lift', () => {
    ['bench', 'squat', 'deadlift'].forEach((canonical) => {
      expect(exerciseMap[canonical as keyof typeof exerciseMap].tags).toContain('comp-lift');
    });
  });
});

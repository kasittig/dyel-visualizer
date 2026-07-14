import { describe, it, expect } from 'vitest';
import { conjugateChartSpecs } from './conjugateChartSpecs';

describe('conjugateChartSpecs', () => {
  it.each([
    ['squat', 'e1rm-max-effort'],
    ['bench', 'e1rm-max-effort'],
    ['deadlift', 'e1rm-max-effort'],
    ['accessory', 'e1rm'],
  ])('uses %s deriver -> %s for every spec', (liftType, derive) => {
    const specs = conjugateChartSpecs(liftType);
    expect(specs.map((s) => s.derive)).toEqual([derive, derive, derive]);
    expect(specs.map((s) => s.id)).toEqual(['variations', 'normalized', 'variationsAdjusted']);
  });
});

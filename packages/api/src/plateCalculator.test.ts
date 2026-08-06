import { describe, expect, it } from 'vitest';
import { CALIBRATED_PLATES, calculatePlateLoad, STANDARD_IRON_PLATES } from './plateCalculator';

const calc = (targetWeight: number, barWeight: number, inventory = CALIBRATED_PLATES) =>
  calculatePlateLoad({ targetWeight, barWeight, inventory });

describe('plate inventories', () => {
  it.each([
    [
      'calibrated',
      CALIBRATED_PLATES,
      [55, 45, 35, 25, 10, 5, 2.5],
      ['red', 'blue', 'yellow', 'green', 'white', 'black', 'grey'],
    ],
    ['standard iron', STANDARD_IRON_PLATES, [45, 25, 10, 5, 2.5], []],
  ])('defines the %s inventory largest-first', (_, inventory, weights, colors) => {
    expect(inventory.map((plate) => plate.weight)).toEqual(weights);
    expect(inventory.map((plate) => plate.color).filter(Boolean)).toEqual(colors);
    expect(
      inventory.every((plate) => plate.style === (colors.length ? 'calibrated' : 'iron'))
    ).toBe(true);
  });
});

describe('calculatePlateLoad', () => {
  it.each([
    ['calibrated exact', 165, 55, CALIBRATED_PLATES, 'exact', 165, 0, [55]],
    ['standard exact', 135, 45, STANDARD_IRON_PLATES, 'exact', 135, 0, [45]],
    ['repeated plates', 225, 45, STANDARD_IRON_PLATES, 'exact', 225, 0, [45, 45]],
    ['empty sleeves', 45, 45, CALIBRATED_PLATES, 'exact', 45, 0, []],
    ['closest under target', 166, 45, CALIBRATED_PLATES, 'closest-under-target', 165, -1, [55, 5]],
  ])('%s', (_, targetWeight, barWeight, inventory, status, loadedTotal, difference, weights) => {
    const result = calc(targetWeight, barWeight, inventory);

    expect(result).toMatchObject({ status, targetWeight, barWeight, loadedTotal, difference });
    expect(result.plates.map((plate) => plate.weight)).toEqual(weights);
  });

  it.each([
    ['below bar', 44, 45, 'below-bar'],
    ['negative target', -1, 45, 'invalid'],
    ['negative bar', 100, -1, 'invalid'],
    ['NaN target', NaN, 45, 'invalid'],
    ['infinite bar', 100, Infinity, 'invalid'],
  ])('%s is non-loadable', (_, targetWeight, barWeight, status) => {
    expect(calc(targetWeight, barWeight)).toMatchObject({
      status,
      targetWeight,
      barWeight,
      loadedTotal: null,
      difference: null,
      plates: [],
    });
  });
});

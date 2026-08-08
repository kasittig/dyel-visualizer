import { describe, expect, it } from 'vitest';
import { groupBy } from './groupBy';

describe('groupBy', () => {
  it('groups values and passes each iterable index to the selector', () => {
    const indexes: number[] = [];

    expect(
      groupBy(new Set(['ant', 'bear', 'ape']), (value, index) => {
        indexes.push(index);
        return value[0];
      })
    ).toEqual(
      new Map([
        ['a', ['ant', 'ape']],
        ['b', ['bear']],
      ])
    );
    expect(indexes).toEqual([0, 1, 2]);
  });
});

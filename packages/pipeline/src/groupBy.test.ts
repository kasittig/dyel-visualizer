import { describe, expect, it } from 'vitest';
import { groupBy } from './groupBy';

describe('groupBy', () => {
  it('groups values while preserving key and value order', () => {
    const groups = groupBy(['pear', 'apple', 'plum', 'apricot'], (value) => value[0]);

    expect([...groups]).toEqual([
      ['p', ['pear', 'plum']],
      ['a', ['apple', 'apricot']],
    ]);
  });

  it('passes each item index to the key selector', () => {
    const groups = groupBy(['a', 'b', 'c'], (_value, index) => index % 2);

    expect(groups.get(0)).toEqual(['a', 'c']);
    expect(groups.get(1)).toEqual(['b']);
  });
});

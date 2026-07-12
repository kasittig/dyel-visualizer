import { describe, it, expect } from 'vitest';
import { parseIndexCsv } from './parseIndexCsv';

describe('parseIndexCsv', () => {
  const mockRows = [
    { name: 'Alice', url: 'https://example.com/alice' },
    { name: 'Bob', url: 'https://example.com/bob' },
  ];

  it.each([
    ['basic', 'name,url\nAlice,https://example.com/alice\nBob,https://example.com/bob', mockRows],
    [
      'whitespace',
      'name , url \n Alice , https://example.com/alice \n Bob, https://example.com/bob ',
      mockRows,
    ],
    [
      'empty lines',
      'name,url\nAlice,https://example.com/alice\n\nBob,https://example.com/bob\n',
      mockRows,
    ],
    [
      'missing name',
      'name,url\nAlice,https://example.com/alice\n,https://example.com/carol',
      [mockRows[0]],
    ],
    ['missing url', 'name,url\nAlice,https://example.com/alice\nBob,', [mockRows[0]]],
    ['case insensitive', 'NAME,URL\nAlice,https://example.com/alice', [mockRows[0]]],
    ['single', 'name,url\nAlice,https://example.com/alice', [mockRows[0]]],
    ['empty csv', '', []],
    ['headers only', 'name,url', []],
    ['missing url header', 'name\nAlice', []],
    ['missing name header', 'url\nhttps://example.com/alice', []],
  ])('%s', (_, csv, expected) => {
    expect(parseIndexCsv(csv)).toEqual(expected);
  });
});

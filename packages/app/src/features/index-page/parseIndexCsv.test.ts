import { describe, it, expect } from 'vitest';
import { parseIndexCsv } from './parseIndexCsv';

describe('parseIndexCsv', () => {
  it.each([
    [
      'basic two rows',
      'name,url\nAlice,https://example.com/alice\nBob,https://example.com/bob',
      [
        { name: 'Alice', url: 'https://example.com/alice' },
        { name: 'Bob', url: 'https://example.com/bob' },
      ],
    ],
    [
      'with whitespace',
      'name , url \n  Alice  ,  https://example.com/alice  \n Bob, https://example.com/bob ',
      [
        { name: 'Alice', url: 'https://example.com/alice' },
        { name: 'Bob', url: 'https://example.com/bob' },
      ],
    ],
    [
      'empty lines skipped',
      'name,url\nAlice,https://example.com/alice\n\nBob,https://example.com/bob\n',
      [
        { name: 'Alice', url: 'https://example.com/alice' },
        { name: 'Bob', url: 'https://example.com/bob' },
      ],
    ],
    [
      'missing name column',
      'name,url\nAlice,https://example.com/alice\n,https://example.com/carol',
      [{ name: 'Alice', url: 'https://example.com/alice' }],
    ],
    [
      'missing url column',
      'name,url\nAlice,https://example.com/alice\nBob,',
      [{ name: 'Alice', url: 'https://example.com/alice' }],
    ],
    [
      'case insensitive headers',
      'NAME,URL\nAlice,https://example.com/alice',
      [{ name: 'Alice', url: 'https://example.com/alice' }],
    ],
    [
      'single entry',
      'name,url\nAlice,https://example.com/alice',
      [{ name: 'Alice', url: 'https://example.com/alice' }],
    ],
    ['empty csv', '', []],
    ['headers only', 'name,url', []],
    ['missing url column', 'name\nAlice', []],
    ['missing name column', 'url\nhttps://example.com/alice', []],
  ])('parseIndexCsv %s', (_, csv, expected) => {
    expect(parseIndexCsv(csv)).toEqual(expected);
  });
});

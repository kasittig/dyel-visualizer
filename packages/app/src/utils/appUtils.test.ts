import { describe, it, expect } from 'vitest';
import { extractSheetRef } from './appUtils';

describe('extractSheetRef', () => {
  it('parses a published web URL as published', () => {
    const ref = extractSheetRef('https://docs.google.com/spreadsheets/d/e/2PACX-abc_123/pubhtml');
    expect(ref).toEqual({ id: '2PACX-abc_123', published: true });
  });

  it('parses a /u/0/ published URL as published', () => {
    const ref = extractSheetRef(
      'https://docs.google.com/spreadsheets/u/0/d/e/PUBID/pub?output=csv'
    );
    expect(ref).toEqual({ id: 'PUBID', published: true });
  });

  it('parses an edit/view URL as not published', () => {
    const ref = extractSheetRef(
      'https://docs.google.com/spreadsheets/d/1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c/edit#gid=0'
    );
    expect(ref).toEqual({
      id: '1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c',
      published: false,
    });
  });

  it('accepts a bare sheet id (20+ chars)', () => {
    const ref = extractSheetRef('1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c');
    expect(ref).toEqual({
      id: '1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c',
      published: false,
    });
  });

  it('returns null for unrelated text and short ids', () => {
    expect(extractSheetRef('https://example.com')).toBeNull();
    expect(extractSheetRef('short-id')).toBeNull();
    expect(extractSheetRef('')).toBeNull();
  });
});

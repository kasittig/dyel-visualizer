import { describe, it, expect } from 'vitest';
import { extractTextLines } from './textExtract';

describe('extractTextLines', () => {
  it('returns null for empty string input', () => {
    expect(extractTextLines('')).toBeNull();
  });

  it('returns null for whitespace-only / all-blank-lines input', () => {
    expect(extractTextLines('   \n\n  \n')).toBeNull();
  });

  it('splits multi-line input into trimmed lines, dropping blank lines in between', () => {
    const input = 'comp squat 300lbs\n\ncomp bench 200lbs\n';
    expect(extractTextLines(input)).toEqual(['comp squat 300lbs', 'comp bench 200lbs']);
  });

  it('trims leading/trailing whitespace on each line', () => {
    const input = '  comp squat 300lbs  \n  comp bench 200lbs  ';
    expect(extractTextLines(input)).toEqual(['comp squat 300lbs', 'comp bench 200lbs']);
  });
});

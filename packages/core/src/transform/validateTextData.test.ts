import { validateTextData } from './validateTextData';
import { describe, it, expect } from 'vitest';

describe('validateTextData', () => {
  it('returns ok for valid text', () => {
    const r = validateTextData(
      'comp squat 405lbs x2\ncomp bench 245lbs x2\ncomp deadlift 455lbs x2'
    );
    expect(r.verdict).toBe('ok');
    expect(r.lines.parsed).toBe(3);
    expect(r.lines.liftTypes.squat).toBe(1);
    expect(r.lines.liftTypes.bench).toBe(1);
    expect(r.lines.liftTypes.deadlift).toBe(1);
  });

  it('returns error for empty text', () => {
    const r = validateTextData('   \n  ');
    expect(r.verdict).toBe('error');
    expect(r.lines.total).toBe(0);
  });

  it('returns warning when some lines fail to parse but others succeed', () => {
    const r = validateTextData('comp squat 405lbs x2\nnot a valid line at all here');
    expect(r.verdict).toBe('warning');
    expect(r.lines.parsed).toBe(1);
    expect(r.lineIssues.length).toBe(1);
  });

  it('returns error when no lines parse', () => {
    const r = validateTextData('gibberish\nmore gibberish');
    expect(r.verdict).toBe('error');
    expect(r.lines.parsed).toBe(0);
  });

  it('handles rep-max lines', () => {
    const r = validateTextData('comp squat 1rm 405lbs');
    expect(r.verdict).toBe('ok');
    expect(r.lines.parsed).toBe(1);
    expect(r.lines.liftTypes.squat).toBe(1);
  });

  it('handles a line with an explicit date', () => {
    const r = validateTextData('comp squat 405lbs x2 2024-11-04');
    expect(r.verdict).toBe('ok');
    expect(r.lines.parsed).toBe(1);
  });

  it('warns when only accessories are recognized', () => {
    const r = validateTextData('bicep curl 30lbs x10');
    expect(r.warnings.some((w) => w.includes('only accessories'))).toBe(true);
  });
});

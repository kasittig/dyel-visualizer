import { describe, expect, it } from 'vitest';
import { parseRepMaxSessions } from './parseRepMaxSessions';

describe('parseRepMaxSessions', () => {
  it('returns an empty array when there are no rep-max columns', () => {
    expect(parseRepMaxSessions({ exercise: 'Squat', weight: '315', reps: '5' }, 'lbs')).toEqual([]);
  });

  it('expands a single populated rep-max column into one session', () => {
    const sessions = parseRepMaxSessions({ exercise: 'Squat', '1rm': '315' }, 'lbs');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].weight).toBe(315);
    expect(sessions[0].reps).toBe(1);
    expect(sessions[0].e1rm).toBe(315);
    expect(sessions[0].sets).toBe(1);
  });

  it('expands multiple populated rep-max columns into multiple sessions on the same date', () => {
    const sessions = parseRepMaxSessions(
      { exercise: 'Squat', date: '2024-01-15', '1rm': '315', '3rm': '285', '5rm': '265' },
      'lbs'
    );
    expect(sessions).toHaveLength(3);
    expect(sessions.map((s) => s.reps)).toEqual([1, 3, 5]);
    expect(sessions.map((s) => s.weight)).toEqual([315, 285, 265]);
    expect(sessions.every((s) => s.date.getTime() === sessions[0].date.getTime())).toBe(true);
  });

  it('skips blank rep-max cells but keeps populated ones', () => {
    const sessions = parseRepMaxSessions({ exercise: 'Squat', '1rm': '315', '3rm': '' }, 'lbs');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].reps).toBe(1);
  });

  it('skips non-numeric rep-max cells', () => {
    const sessions = parseRepMaxSessions({ exercise: 'Squat', '1rm': 'n/a' }, 'lbs');
    expect(sessions).toEqual([]);
  });

  it('uses a shared sets column across all derived sessions', () => {
    const sessions = parseRepMaxSessions(
      { exercise: 'Squat', '1rm': '315', '3rm': '285', sets: '2' },
      'lbs'
    );
    expect(sessions.every((s) => s.sets === 2)).toBe(true);
  });

  it('defaults sets to 1 when no sets column is present', () => {
    const sessions = parseRepMaxSessions({ exercise: 'Squat', '1rm': '315' }, 'lbs');
    expect(sessions[0].sets).toBe(1);
  });

  it('returns an empty array for an invalid date', () => {
    expect(
      parseRepMaxSessions({ exercise: 'Squat', date: 'not-a-date', '1rm': '315' }, 'lbs')
    ).toEqual([]);
  });

  it('applies rpe to all derived sessions and adjusts e1rm', () => {
    const sessions = parseRepMaxSessions({ exercise: 'Squat', '1rm': '315', rpe: '8' }, 'lbs');
    expect(sessions[0].rpe).toBe(8);
    expect(sessions[0].e1rm).toBeGreaterThan(315);
  });
});

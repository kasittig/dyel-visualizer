import { describe, expect, it } from 'vitest';
import { parseSessions } from './parseSessions';

describe('parseSessions', () => {
  it('parses a single session from a plain weight/reps row', () => {
    const sessions = parseSessions({ exercise: 'Squat', weight: '315', reps: '5' }, 'lbs');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].weight).toBe(315);
    expect(sessions[0].reps).toBe(5);
  });

  it('prefers rep-max columns over weight/reps when both are present', () => {
    const sessions = parseSessions(
      { exercise: 'Squat', weight: '315', reps: '5', '1rm': '325' },
      'lbs'
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].weight).toBe(325);
    expect(sessions[0].reps).toBe(1);
  });

  it('expands rep-max columns into multiple sessions', () => {
    const sessions = parseSessions({ exercise: 'Squat', '1rm': '315', '3rm': '285' }, 'lbs');
    expect(sessions).toHaveLength(2);
  });

  it('returns an empty array for an unparseable row', () => {
    expect(parseSessions({ exercise: 'Squat' }, 'lbs')).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import type { AccessoryTableRow } from '@dyel/api';
import { formatAccessoryProgress } from './useAccessoryTable';

const session = (date: string, weight: number) => ({ date, sets: 1, reps: 10, weight, rpe: null });

describe('formatAccessoryProgress', () => {
  it('labels volume changes as kg-reps rather than a plain load', () => {
    const row: AccessoryTableRow = {
      label: 'Row',
      subtype: 'upper',
      effects: [],
      lastSession: session('2026-01-31', 110),
      sessionCount: 2,
      sessionCountInRange: 2,
      progress: {
        scope: 'all-time',
        status: 'progressing',
        latest: session('2026-01-31', 110),
        previous: session('2026-01-24', 100),
        best: session('2026-01-31', 110),
        daysSinceLastPerformed: 0,
        change: { load: 10, reps: 0, volume: 100 },
      },
    };

    expect(formatAccessoryProgress(row, 'kg')).toMatchObject({
      summary: 'Progressing · +100 kg-reps',
    });
  });
});

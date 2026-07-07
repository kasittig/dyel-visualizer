import { describe, it, expect } from 'vitest';
import type { RechartsRow } from '@dyel/pipeline';
import { snapshotVariationsFromPipeline, diffVariationSnapshots } from './diffVariationSnapshot';

describe('diffVariationSnapshot helpers', () => {
  describe('snapshotVariationsFromPipeline', () => {
    it('extracts last row values from variation time series', () => {
      const rows: RechartsRow[] = [
        { t: 1000, 'Box Squat': 100, 'Squat (SSB)': 110 },
        { t: 2000, 'Box Squat': 105, 'Squat (SSB)': 115 },
        { t: 1500, 'Box Squat': 102, 'Squat (SSB)': 112 },
      ];

      const snapshot = snapshotVariationsFromPipeline(rows, 'kg');

      // Should extract the last (highest timestamp) row: t=2000
      expect(snapshot['Box Squat']).toBe(105);
      expect(snapshot['Squat (SSB)']).toBe(115);
    });

    it('converts kg to lbs when requested', () => {
      const rows: RechartsRow[] = [{ t: 1000, Variation: 100 }]; // 100 kg ≈ 220.46 lbs
      const snapshot = snapshotVariationsFromPipeline(rows, 'lbs');
      expect(snapshot['Variation']).toBe(220); // rounded
    });

    it('handles empty variation rows gracefully', () => {
      const snapshot = snapshotVariationsFromPipeline([], 'lbs');
      expect(snapshot).toEqual({});
    });

    it('ignores timestamp key "t" in snapshot', () => {
      const rows: RechartsRow[] = [{ t: 1000, Variation: 100 }];
      const snapshot = snapshotVariationsFromPipeline(rows, 'kg');
      expect(snapshot['t']).toBeUndefined();
      expect(Object.keys(snapshot)).not.toContain('t');
    });
  });

  describe('diffVariationSnapshots', () => {
    it('computes differences between two snapshots', () => {
      const legacy = { 'Box Squat': 100, 'Squat (SSB)': 110 };
      const pipeline = { 'Box Squat': 105, 'Squat (SSB)': 115 };

      const diffs = diffVariationSnapshots(legacy, pipeline);

      expect(diffs).toHaveLength(2);
      const boxSquat = diffs.find((d) => d.variationName === 'Box Squat');
      expect(boxSquat?.absDiff).toBe(5);
      expect(boxSquat?.relDiff).toBeCloseTo(5 / 105, 2);
    });

    it('handles missing values in either snapshot', () => {
      const legacy = { 'Box Squat': 100, 'Squat (SSB)': undefined };
      const pipeline = { 'Box Squat': 105, 'Squat (SSB)': 110 };

      const diffs = diffVariationSnapshots(legacy, pipeline);

      expect(diffs).toHaveLength(2);
      const missing = diffs.find((d) => d.variationName === 'Squat (SSB)');
      expect(missing?.legacyValue).toBeUndefined();
      expect(missing?.pipelineValue).toBe(110);
    });

    it('returns sorted results by variation name', () => {
      const legacy = { Zebra: 100, Alpha: 105 };
      const pipeline = { Zebra: 100, Alpha: 105 };

      const diffs = diffVariationSnapshots(legacy, pipeline);

      expect(diffs[0].variationName).toBe('Alpha');
      expect(diffs[1].variationName).toBe('Zebra');
    });

    it('computes zero diff when values match', () => {
      const snapshot = { 'Box Squat': 100, 'Squat (SSB)': 110 };
      const diffs = diffVariationSnapshots(snapshot, snapshot);

      diffs.forEach((d) => {
        expect(d.absDiff).toBe(0);
        expect(d.relDiff).toBe(0);
      });
    });
  });
});

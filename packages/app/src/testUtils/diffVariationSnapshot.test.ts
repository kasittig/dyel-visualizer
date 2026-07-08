import { describe, it, expect } from 'vitest';
import type { RechartsRow } from '@dyel/pipeline';
import { snapshotVariationsFromPipeline, diffVariationSnapshots } from './diffVariationSnapshot';

describe('diffVariationSnapshot helpers', () => {
  describe('snapshotVariationsFromPipeline', () => {
    it('extracts latest timestamp row values', () => {
      const rows: RechartsRow[] = [
        { t: 1000, A: 100 },
        { t: 2000, A: 105 },
        { t: 1500, A: 102 },
      ];
      expect(snapshotVariationsFromPipeline(rows, 'kg')).toEqual({ A: 105 });
    });

    it('converts kg to lbs', () => {
      expect(snapshotVariationsFromPipeline([{ t: 1000, V: 100 }], 'lbs')).toEqual({ V: 220 });
    });

    it('handles empty rows gracefully', () => {
      expect(snapshotVariationsFromPipeline([], 'lbs')).toEqual({});
    });

    it('ignores timestamp key "t"', () => {
      expect(snapshotVariationsFromPipeline([{ t: 1000, V: 100 }], 'kg')).not.toHaveProperty('t');
    });
  });

  describe('diffVariationSnapshots', () => {
    it('computes differences between two snapshots', () => {
      const res = diffVariationSnapshots({ B: 100, S: 110 }, { B: 105, S: 115 });
      expect(res).toContainEqual(expect.objectContaining({ variationName: 'B', absDiff: 5 }));
    });

    it('handles missing values in snapshots', () => {
      const res = diffVariationSnapshots({ B: 100, S: undefined }, { B: 105, S: 110 });
      expect(res.find((d) => d.variationName === 'S')).toMatchObject({
        legacyValue: undefined,
        pipelineValue: 110,
      });
    });

    it('sorts results alphabetically by name', () => {
      const res = diffVariationSnapshots({ Zebra: 100, Alpha: 105 }, { Zebra: 100, Alpha: 105 });
      expect(res[0].variationName).toBe('Alpha');
      expect(res[1].variationName).toBe('Zebra');
    });

    it('computes zero diff when values match', () => {
      const snap = { B: 100, S: 110 };
      diffVariationSnapshots(snap, snap).forEach((d) =>
        expect(d).toMatchObject({ absDiff: 0, relDiff: 0 })
      );
    });
  });
});

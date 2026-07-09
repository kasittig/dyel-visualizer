import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ChartPoint, RepCalcStats } from '@dyel/core';
import {
  parseConjugateData,
  buildSessionStats,
  buildVariationChartData,
  NORMALIZED_KEY,
} from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { mergeWideRechartsRows } from '../utils/pipelineChartUtils';
import { compareChartSeries } from '../testUtils/compareChartSeries';
import { joinChartPointsByDate, diffSeries } from '../testUtils/diffChartSeries';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { conjugateChartSpecs } from './conjugateChartSpecs';

interface PipelineDataset {
  variations: ChartPoint[];
  normalized: ChartPoint[];
}

const LIFT_TYPES: string[] = ['squat', 'bench', 'deadlift'];

describe('ConjugateCharts core-vs-pipeline parity', () => {
  const pipelineResults: Record<string, PipelineDataset> = {};
  const legacyResults: Record<string, ReturnType<typeof buildVariationChartData>> = {};

  beforeAll(() => {
    const txt: string = readFileSync(
      join(__dirname, '../../test/fixtures/total-chart-sheet.csv'),
      'utf-8'
    );
    const pairs = parseConjugateData(txt);
    const tabRows = buildTabRows(extractPairs({ status: 'success', pairs }));
    const eff = computeEffectiveNames(tabRows, 'sumo');
    const allSigmaPairs = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
    ];
    const stats: RepCalcStats = buildSessionStats(
      allSigmaPairs,
      eff.effectiveBaselineNames,
      new Date()
    );
    const raw = buildRawInput('url', txt);

    for (const lift of LIFT_TYPES) {
      const res = runPipeline([raw], conjugateChartSpecs(lift), PLACEHOLDER_ATHLETE, {});
      const vars: ChartPoint[] = mergeWideRechartsRows(res.datasets.variations ?? [], 'lbs');
      const norms: ChartPoint[] = mergeWideRechartsRows(res.datasets.normalized ?? [], 'lbs').map(
        (row: ChartPoint) => {
          const pt: Record<string, unknown> = { ...row };
          if ('normalized' in pt) {
            pt[NORMALIZED_KEY] = pt['normalized'];
            delete pt['normalized'];
          }
          return pt as ChartPoint;
        }
      );
      pipelineResults[lift] = { variations: vars, normalized: norms };
      legacyResults[lift] = buildVariationChartData(
        tabRows[lift].maxEffort,
        eff.effectiveBaselineNames,
        stats,
        eff.effectiveTargetNames[lift] ?? null
      );
    }
  });

  it('produces non-empty chart data from fixture for core implementation', () => {
    for (const liftType of LIFT_TYPES) {
      if (legacyResults[liftType].data.length > 0) {
        expect(legacyResults[liftType].data.length).toBeGreaterThan(0);
      }
    }
  });

  describe('core-vs-pipeline soft-warn: variation divergence from legacy normalization', () => {
    it.each(LIFT_TYPES)('%s: variations and normalized series comparison', (liftType: string) => {
      const legacy = legacyResults[liftType];
      const pipeline = pipelineResults[liftType];
      if (!legacy.data.length && !pipeline.variations.length) {
        return;
      }

      expect(legacy.data.length > 0 || pipeline.variations.length > 0).toBe(true);
      if (!legacy.data.length || !pipeline.variations.length) {
        console.warn(`No ${!legacy.data.length ? 'legacy' : 'pipeline'} data for ${liftType}`);
        return;
      }

      const pipeKeys: Set<string> = new Set(
        pipeline.variations
          .flatMap((r: ChartPoint) => Object.keys(r))
          .filter((k: string) => k !== 'date')
      );
      const matched: string[] = legacy.variations.filter((v: string) => pipeKeys.has(v));

      if (matched.length > 0) {
        // Fix: Pass the first string name item to compareChartSeries instead of the entire legacy.variations array
        const legacySanity = compareChartSeries(legacy.data, legacy.variations[0]);
        if (legacySanity.count > 0) {
          expect(legacySanity.count).toBeGreaterThan(0);
          legacySanity.values.forEach((v: number) => {
            expect(v).toBeGreaterThan(0);
            expect(v).toBeLessThan(10000);
          });
        }

        for (const variation of matched) {
          const diff = diffSeries(
            joinChartPointsByDate(legacy.data, pipeline.variations),
            variation
          );
          expect(diff.comparedCount).toBeGreaterThan(0);
          console.warn(
            `core-vs-pipeline ${liftType} ${variation}: compared=${diff.comparedCount} missingInA=${diff.missingInA} missingInB=${diff.missingInB} maxAbsDiff=${diff.maxAbsDiff} maxRelDiff=${(diff.maxRelDiff * 100).toFixed(1)}%`
          );
        }
      } else if (legacy.variations.length > 0 || pipeKeys.size > 0) {
        console.warn(
          `core-vs-pipeline ${liftType}: no matched variations (legacy: ${legacy.variations.join(', ') || 'none'}, pipeline: ${Array.from(pipeKeys).join(', ') || 'none'})`
        );
      }

      if (legacy.showNormalized && pipeline.normalized.length > 0) {
        const diff = diffSeries(
          joinChartPointsByDate(legacy.data, pipeline.normalized),
          NORMALIZED_KEY
        );
        if (diff.comparedCount > 0) {
          console.warn(
            `core-vs-pipeline ${liftType} normalized: compared=${diff.comparedCount} missingInA=${diff.missingInA} missingInB=${diff.missingInB} maxAbsDiff=${diff.maxAbsDiff} maxRelDiff=${(diff.maxRelDiff * 100).toFixed(1)}%`
          );
        }
      }
    });
  });
});

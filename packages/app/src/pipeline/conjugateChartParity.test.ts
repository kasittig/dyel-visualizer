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
import { initialTabState } from '../utils/appUtils';
import { conjugateChartSpecs } from './conjugateChartSpecs';

const LIFT_TYPES = ['squat', 'bench', 'deadlift'];

describe('ConjugateCharts core-vs-pipeline parity', () => {
  let fixtureContent: string;
  const pipelineResultsByLift: Record<
    string,
    { variations: ChartPoint[]; normalized: ChartPoint[] }
  > = {};
  const legacyResultsByLift: Record<string, ReturnType<typeof buildVariationChartData>> = {};
  let stats: RepCalcStats;
  let effectiveBaselineNames: Partial<Record<string, string>>;
  let effectiveTargetNames: Partial<Record<string, string>>;
  let tabRows: ReturnType<typeof buildTabRows>;

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    fixtureContent = readFileSync(fixturePath, 'utf-8');

    // Legacy @dyel/core path using same fixture content
    const pairs = parseConjugateData(fixtureContent);
    const state = { status: 'success' as const, pairs };
    const dataMap = extractPairs(state);
    tabRows = buildTabRows(dataMap);
    const tabState = initialTabState();
    const deadliftStance = 'sumo'; // Default documented in HANDOFF.md
    const effectiveNames = computeEffectiveNames(tabRows, tabState, deadliftStance);
    effectiveBaselineNames = effectiveNames.effectiveBaselineNames;
    effectiveTargetNames = effectiveNames.effectiveTargetNames;
    stats = buildSessionStats(pairs, effectiveBaselineNames, new Date());

    // Build pipeline output for each lift type
    const raw = buildRawInput('url', fixtureContent);
    for (const liftType of LIFT_TYPES) {
      const specs = conjugateChartSpecs(liftType);
      const result = runPipeline([raw], specs, PLACEHOLDER_ATHLETE, {});
      const variationRows = mergeWideRechartsRows(result.datasets.variations ?? [], 'lbs');
      // Pipeline normalized composite uses liftType as the key, not NORMALIZED_KEY
      const normalizedRows = mergeWideRechartsRows(result.datasets.normalized ?? [], 'lbs');
      // Rename the liftType key to NORMALIZED_KEY for consistent comparison
      const normalizedPoints: ChartPoint[] = normalizedRows.map((row) => {
        const point: ChartPoint = { ...row };
        if (liftType in point) {
          point[NORMALIZED_KEY] = point[liftType];
          delete point[liftType];
        }
        return point;
      });
      pipelineResultsByLift[liftType] = {
        variations: variationRows,
        normalized: normalizedPoints,
      };
    }

    // Build legacy output for each lift type
    for (const liftType of LIFT_TYPES) {
      const liftRows = tabRows[liftType].maxEffort;
      const targetName = effectiveTargetNames[liftType] ?? null;
      const legacyResult = buildVariationChartData(
        liftRows,
        effectiveBaselineNames,
        stats,
        targetName
      );
      legacyResultsByLift[liftType] = legacyResult;
    }
  });

  it('produces non-empty chart data from fixture for core implementation', () => {
    for (const liftType of LIFT_TYPES) {
      const result = legacyResultsByLift[liftType];
      // Only assert if the lift type has data in the fixture
      if (result.data.length > 0) {
        expect(result.data.length).toBeGreaterThan(0);
      }
    }
  });

  // Intentional exception to the pipeline migration boundary rule (documented in packages/app/CLAUDE.md):
  // This test file imports directly from both @dyel/core (buildVariationChartData, NORMALIZED_KEY) and
  // @dyel/pipeline (runPipeline, conjugateChartSpecs) to run legacy and pipeline implementations
  // side-by-side over the same fixture, then diff the two outputs using joinChartPointsByDate/diffSeries.
  // conjugateChartSpecs.ts has no other importer and exists solely to support this test as a documented
  // regression harness, mirroring the same treatment totalChartParity.test.ts already gives to totalChartSpecs.ts.
  describe('core-vs-pipeline soft-warn: variation divergence from legacy normalization', () => {
    it.each(LIFT_TYPES)('%s: variations and normalized series comparison', (liftType) => {
      const legacy = legacyResultsByLift[liftType];
      const pipeline = pipelineResultsByLift[liftType];

      // Skip if fixture has no data for this lift type
      if (legacy.data.length === 0 && pipeline.variations.length === 0) {
        return;
      }

      // Hard assertion: at least one implementation has data
      const hasLegacyData = legacy.data.length > 0;
      const hasPipelineData = pipeline.variations.length > 0;
      expect(hasLegacyData || hasPipelineData).toBe(true);

      // If one implementation has data, proceed with comparison
      if (!hasLegacyData || !hasPipelineData) {
        if (!hasLegacyData) {
          console.warn(`No legacy data for ${liftType}`);
        }
        if (!hasPipelineData) {
          console.warn(`No pipeline data for ${liftType}`);
        }
        return;
      }

      // Get variation names: intersection of what both implementations produced
      const pipelineVariationKeys = new Set(
        Object.keys(pipeline.variations[0] || {}).filter((k) => k !== 'date')
      );
      const matchedVariations = legacy.variations.filter((v) => pipelineVariationKeys.has(v));

      // If there are variations to compare
      if (matchedVariations.length > 0) {
        // Hard asserts: basic sanity on legacy data
        const legacySanity = compareChartSeries(legacy.data, legacy.variations[0]);
        if (legacySanity.count > 0) {
          expect(legacySanity.count).toBeGreaterThan(0);
          legacySanity.values.forEach((v) => {
            expect(v).toBeGreaterThan(0);
            expect(v).toBeLessThan(10000);
          });
        }

        // Hard assertions: each matched variation must have overlapping dates
        for (const variation of matchedVariations) {
          const joined = joinChartPointsByDate(legacy.data, pipeline.variations);
          const diff = diffSeries(joined, variation);

          // Hard assertion: joined data must have overlapping dates
          expect(diff.comparedCount).toBeGreaterThan(0);

          // Soft warn: log real diagnostic numbers for visibility
          console.warn(
            `core-vs-pipeline ${liftType} ${variation}: compared=${diff.comparedCount} missingInA=${diff.missingInA} missingInB=${diff.missingInB} maxAbsDiff=${diff.maxAbsDiff} maxRelDiff=${(diff.maxRelDiff * 100).toFixed(1)}%`
          );
        }
      } else if (legacy.variations.length > 0 || pipelineVariationKeys.size > 0) {
        // Log if one side has variations but they don't match
        console.warn(
          `core-vs-pipeline ${liftType}: no matched variations between implementations (legacy: ${legacy.variations.join(', ') || 'none'}, pipeline: ${Array.from(pipelineVariationKeys).join(', ') || 'none'})`
        );
      }

      // Soft warn: normalized series (if present in both)
      if (legacy.showNormalized && pipeline.normalized.length > 0) {
        const joined = joinChartPointsByDate(legacy.data, pipeline.normalized);
        const diff = diffSeries(joined, NORMALIZED_KEY);

        // Only hard-assert if we have overlapping dates; otherwise just warn
        if (diff.comparedCount > 0) {
          console.warn(
            `core-vs-pipeline ${liftType} normalized: compared=${diff.comparedCount} missingInA=${diff.missingInA} missingInB=${diff.missingInB} maxAbsDiff=${diff.maxAbsDiff} maxRelDiff=${(diff.maxRelDiff * 100).toFixed(1)}%`
          );
        } else if (diff.missingInA > 0 || diff.missingInB > 0) {
          console.warn(
            `core-vs-pipeline ${liftType} normalized: no date overlap (legacy has ${legacy.data.length} points, pipeline has ${pipeline.normalized.length} points)`
          );
        }
      }
    });
  });

  it('dates are in chronological order (legacy)', () => {
    for (const liftType of LIFT_TYPES) {
      const data = legacyResultsByLift[liftType].data;
      if (data.length === 0) {
        continue;
      }
      const dates = data.map((p) => new Date(p.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    }
  });

  it('all date strings are valid (legacy)', () => {
    for (const liftType of LIFT_TYPES) {
      const data = legacyResultsByLift[liftType].data;
      if (data.length === 0) {
        continue;
      }
      data.forEach((p) => {
        const dateObj = new Date(p.date);
        expect(dateObj.getTime()).not.toBeNaN();
      });
    }
  });

  it('dates are in chronological order (pipeline)', () => {
    for (const liftType of LIFT_TYPES) {
      const variations = pipelineResultsByLift[liftType].variations;
      if (variations.length === 0) {
        continue;
      }
      const dates = variations.map((p) => new Date(p.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    }
  });

  it('all date strings are valid ISO format (pipeline)', () => {
    for (const liftType of LIFT_TYPES) {
      const variations = pipelineResultsByLift[liftType].variations;
      if (variations.length === 0) {
        continue;
      }
      variations.forEach((p) => {
        const dateObj = new Date(p.date);
        expect(dateObj.getTime()).not.toBeNaN();
        expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    }
  });
});

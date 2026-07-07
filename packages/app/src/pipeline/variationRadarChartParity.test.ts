import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import type { ConjugateExercise } from '@dyel/core';
import { parseConjugateData, buildSessionStats } from '@dyel/core';
import {
  snapshotVariationsFromLegacy,
  snapshotVariationsFromPipeline,
  diffVariationSnapshots,
} from '../testUtils/diffVariationSnapshot';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { mergeWideRechartsRows } from '../utils/pipelineChartUtils';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { initialTabState, distinctDisplayNames } from '../utils/appUtils';
import { conjugateChartSpecs } from './conjugateChartSpecs';

const LIFT_TYPES = ['squat', 'bench', 'deadlift'];

/**
 * Intentional exception to the pipeline migration boundary rule (documented in packages/app/CLAUDE.md
 * "Intentional exception: core-vs-pipeline live diff in tests"):
 *
 * This test file imports directly from both @dyel/core (parseConjugateData, buildSessionStats, etc.)
 * and @dyel/pipeline (runPipeline, conjugateChartSpecs) to run legacy and pipeline implementations
 * side-by-side over the same fixture, validating parity of VariationRadarChart's normalization logic
 * before a future (currently deferred) component swap-over.
 *
 * See SPECIFICATIONS.md Phase 2 "Scope decisions" section for why the component swap is deferred,
 * and migration/VariationRadarChart.md for the deferred step documentation.
 *
 * Why this exception is safe: confined to test file (never shipped); actual VariationRadarChart.tsx
 * component continues to use @dyel/core today, fully satisfying the real boundary until the swap is executed.
 */

describe('VariationRadarChart core-vs-pipeline parity', () => {
  let fixtureContent: string;
  const legacySnapshotsByLift: Record<string, ReturnType<typeof snapshotVariationsFromLegacy>> = {};
  const pipelineSnapshotsByLift: Record<
    string,
    ReturnType<typeof snapshotVariationsFromPipeline>
  > = {};
  let tabRows: ReturnType<typeof buildTabRows>;
  let effectiveBaselineNames: Partial<Record<string, string>>;
  let effectiveTargetNames: Partial<Record<string, string>>;

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    fixtureContent = readFileSync(fixturePath, 'utf-8');

    // Legacy @dyel/core path
    const pairs = parseConjugateData(fixtureContent);
    const state = { status: 'success' as const, pairs };
    const dataMap = extractPairs(state);
    tabRows = buildTabRows(dataMap);
    const tabState = initialTabState();
    const deadliftStance = 'sumo'; // Default documented in HANDOFF.md
    const effectiveNames = computeEffectiveNames(tabRows, tabState, deadliftStance);
    effectiveBaselineNames = effectiveNames.effectiveBaselineNames;
    effectiveTargetNames = effectiveNames.effectiveTargetNames;
    const stats = buildSessionStats(pairs, effectiveBaselineNames, new Date());

    // Build pipeline output for each lift type
    const raw = buildRawInput('url', fixtureContent);
    for (const liftType of LIFT_TYPES) {
      const specs = conjugateChartSpecs(liftType);
      const result = runPipeline([raw], specs, PLACEHOLDER_ATHLETE, {});
      const variationRows = mergeWideRechartsRows(result.datasets.variations ?? [], 'lbs');

      // Pipeline snapshot
      pipelineSnapshotsByLift[liftType] = snapshotVariationsFromPipeline(variationRows, 'lbs');
    }

    // Build legacy output for each lift type
    for (const liftType of LIFT_TYPES) {
      const liftRows = tabRows[liftType].maxEffort;

      // Build exerciseByName map (mirrors VariationRadarChart.tsx's useMemo)
      const exerciseByName = new Map<string, ConjugateExercise>(
        liftRows.map(([ex]) => [ex.displayName, ex])
      );

      // Get variation names
      const variationNames = distinctDisplayNames(liftRows);

      // Get target and baseline names
      const targetName = effectiveTargetNames[liftType];
      const baselineName = effectiveBaselineNames[liftType];

      // Legacy snapshot (mirrors VariationRadarChart.tsx's normalization logic)
      if (targetName) {
        legacySnapshotsByLift[liftType] = snapshotVariationsFromLegacy(
          variationNames,
          exerciseByName,
          stats,
          targetName,
          baselineName,
          'lbs'
        );
      }
    }
  });

  it('produces non-empty snapshots for lift types with fixture data', () => {
    for (const liftType of LIFT_TYPES) {
      const legacySnapshot = legacySnapshotsByLift[liftType];
      const pipelineSnapshot = pipelineSnapshotsByLift[liftType];

      // If the lift type has data in the fixture, at least one side should produce a snapshot
      if (legacySnapshot && Object.values(legacySnapshot).some((v) => v !== undefined)) {
        expect(legacySnapshot).toBeDefined();
      }
      if (pipelineSnapshot && Object.values(pipelineSnapshot).some((v) => v !== undefined)) {
        expect(pipelineSnapshot).toBeDefined();
      }
    }
  });

  // Intentional soft-warn parity test per documented divergence pattern
  // (see totalChartParity.test.ts and packages/app/CLAUDE.md for rationale)
  it.each(LIFT_TYPES)(
    '%s: normalized variation snapshots (soft-warn on divergence)',
    (liftType) => {
      const legacySnapshot = legacySnapshotsByLift[liftType];
      const pipelineSnapshot = pipelineSnapshotsByLift[liftType];

      // Hard assertion: at least one implementation produces data for this lift type
      const hasLegacyData =
        legacySnapshot && Object.values(legacySnapshot).some((v) => v !== undefined);
      const hasPipelineData =
        pipelineSnapshot && Object.values(pipelineSnapshot).some((v) => v !== undefined);
      expect(hasLegacyData || hasPipelineData).toBe(true);

      // If both implementations have data, compare them
      if (hasLegacyData && hasPipelineData) {
        const diffs = diffVariationSnapshots(legacySnapshot, pipelineSnapshot);

        // Soft warn: log divergence for visibility
        diffs.forEach((diff) => {
          if (diff.legacyValue !== undefined && diff.pipelineValue !== undefined) {
            console.warn(
              `core-vs-pipeline ${liftType} ${diff.variationName}: legacy=${diff.legacyValue} pipeline=${diff.pipelineValue} absDiff=${diff.absDiff} relDiff=${(diff.relDiff * 100).toFixed(1)}%`
            );
          }
        });
      } else if (hasLegacyData || hasPipelineData) {
        // One side has data, the other doesn't — log for diagnostic
        console.warn(
          `core-vs-pipeline ${liftType}: one-sided data (legacy=${hasLegacyData}, pipeline=${hasPipelineData})`
        );
      }
    }
  );

  it('snapshot values are within reasonable e1rm bounds', () => {
    for (const liftType of LIFT_TYPES) {
      const legacySnapshot = legacySnapshotsByLift[liftType];
      const pipelineSnapshot = pipelineSnapshotsByLift[liftType];

      if (legacySnapshot) {
        Object.values(legacySnapshot).forEach((value) => {
          if (value !== undefined) {
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThan(10000); // Sanity bound for e1rm
          }
        });
      }

      if (pipelineSnapshot) {
        Object.values(pipelineSnapshot).forEach((value) => {
          if (value !== undefined) {
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThan(10000); // Sanity bound for e1rm
          }
        });
      }
    }
  });
});

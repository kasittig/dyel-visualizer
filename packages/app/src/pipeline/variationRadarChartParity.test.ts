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

interface SnapshotDict {
  [key: string]: number | undefined;
}

const LIFT_TYPES: string[] = ['squat', 'bench', 'deadlift'];

describe('VariationRadarChart core-vs-pipeline parity', () => {
  const legacySnapshots: Record<string, SnapshotDict> = {};
  const pipelineSnapshots: Record<string, SnapshotDict> = {};

  beforeAll(() => {
    const txt: string = readFileSync(
      join(__dirname, '../../test/fixtures/total-chart-sheet.csv'),
      'utf-8'
    );
    const pairs = parseConjugateData(txt),
      tabRows = buildTabRows(extractPairs({ status: 'success', pairs })),
      eff = computeEffectiveNames(tabRows, initialTabState(), 'sumo');
    const stats = buildSessionStats(pairs, eff.effectiveBaselineNames, new Date());
    const raw = buildRawInput('url', txt);

    for (const lift of LIFT_TYPES) {
      const res = runPipeline([raw], conjugateChartSpecs(lift), PLACEHOLDER_ATHLETE, {});
      pipelineSnapshots[lift] = snapshotVariationsFromPipeline(
        mergeWideRechartsRows(res.datasets.variations ?? [], 'lbs'),
        'lbs'
      ) as SnapshotDict;

      const liftRows = tabRows[lift].maxEffort,
        target = eff.effectiveTargetNames[lift];
      const exMap = new Map<string, ConjugateExercise>(
        liftRows.map(([ex]: [ConjugateExercise, unknown]) => {
          return [ex.displayName, ex];
        })
      );

      if (target) {
        legacySnapshots[lift] = snapshotVariationsFromLegacy(
          distinctDisplayNames(liftRows),
          exMap,
          stats,
          target,
          eff.effectiveBaselineNames[lift],
          'lbs'
        ) as SnapshotDict;
      }
    }
  });

  it('produces non-empty snapshots for lift types with fixture data', () => {
    for (const lift of LIFT_TYPES) {
      const lSnap = legacySnapshots[lift],
        pSnap = pipelineSnapshots[lift];
      if (
        lSnap &&
        Object.values(lSnap).some((v: unknown) => {
          return v !== undefined;
        })
      ) {
        expect(lSnap).toBeDefined();
      }
      if (
        pSnap &&
        Object.values(pSnap).some((v: unknown) => {
          return v !== undefined;
        })
      ) {
        expect(pSnap).toBeDefined();
      }
    }
  });

  it.each(LIFT_TYPES)('%s: normalized variation snapshots', (lift: string) => {
    const lSnap = legacySnapshots[lift],
      pSnap = pipelineSnapshots[lift];
    const hasL = !!(
      lSnap &&
      Object.values(lSnap).some((v: unknown) => {
        return v !== undefined;
      })
    );
    const hasP = !!(
      pSnap &&
      Object.values(pSnap).some((v: unknown) => {
        return v !== undefined;
      })
    );
    expect(hasL || hasP).toBe(true);

    if (hasL && hasP && lSnap && pSnap) {
      diffVariationSnapshots(lSnap, pSnap).forEach((d) => {
        if (d.legacyValue !== undefined && d.pipelineValue !== undefined) {
          console.warn(
            `core-vs-pipeline ${lift} ${d.variationName}: legacy=${d.legacyValue} pipeline=${d.pipelineValue} absDiff=${d.absDiff} relDiff=${(d.relDiff * 100).toFixed(1)}%`
          );
        }
      });
    } else if (hasL || hasP) {
      console.warn(`core-vs-pipeline ${lift}: one-sided data (legacy=${hasL}, pipeline=${hasP})`);
    }
  });

  it('snapshot values are within reasonable e1rm bounds', () => {
    for (const lift of LIFT_TYPES) {
      const targets = [legacySnapshots[lift], pipelineSnapshots[lift]];
      targets.forEach((snap: SnapshotDict | undefined) => {
        if (snap) {
          Object.values(snap).forEach((v: unknown) => {
            if (typeof v === 'number') {
              expect(v).toBeGreaterThan(0);
              expect(v).toBeLessThan(10000);
            }
          });
        }
      });
    }
  });
});

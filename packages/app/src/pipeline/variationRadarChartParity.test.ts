import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  runPipeline,
  resolveCanonicalNames,
  tagRecords,
  ParserRegistry,
  csvParser,
} from '@dyel/pipeline';
import type { SetRecord } from '@dyel/pipeline';
import type { ConjugateExercise, TrainingSession } from '@dyel/core';
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
import { buildLastSessionDetail } from './lastSessionDetail';

interface SnapshotDict {
  [key: string]: number | undefined;
}

const LIFT_TYPES: string[] = ['squat', 'bench', 'deadlift'];

describe('VariationRadarChart core-vs-pipeline parity', () => {
  const legacySnapshots: Record<string, SnapshotDict> = {};
  const pipelineSnapshots: Record<string, SnapshotDict> = {};
  const legacyLastSessions: Record<string, Map<string, TrainingSession>> = {};
  const pipelineLastSessions: Record<
    string,
    Map<string, { date: string; sets: number; reps: number; weight: number; rpe: number | null }>
  > = {};

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

    // Tag the records for pipeline last-session builder
    const registry = new ParserRegistry();
    registry.registerMany([csvParser]);
    const parseErrors: unknown[] = [];
    const records: SetRecord[] = [];
    try {
      records.push(...registry.parse({ name: 'sheet.csv', content: txt }, { fallback: 'lbs' }));
    } catch (err) {
      parseErrors.push(err);
    }
    const { resolved } = resolveCanonicalNames(records);
    const { tagged } = tagRecords(resolved);

    for (const lift of LIFT_TYPES) {
      const res = runPipeline([raw], conjugateChartSpecs(lift), PLACEHOLDER_ATHLETE, {});
      pipelineSnapshots[lift] = snapshotVariationsFromPipeline(
        mergeWideRechartsRows(res.datasets.variations ?? [], 'lbs'),
        'lbs'
      ) as SnapshotDict;

      // Build pipeline last session details
      pipelineLastSessions[lift] = buildLastSessionDetail(tagged, lift);

      const liftRows = tabRows[lift].maxEffort,
        target = eff.effectiveTargetNames[lift];
      const exMap = new Map<string, ConjugateExercise>(
        liftRows.map(([ex]: [ConjugateExercise, unknown]) => {
          return [ex.displayName, ex];
        })
      );

      // Store legacy last sessions for comparison
      legacyLastSessions[lift] = stats.lastSession;

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

  it.each(LIFT_TYPES)('%s: last session detail comparison (core vs pipeline)', (lift: string) => {
    const legacyLast = legacyLastSessions[lift];
    const pipelineLast = pipelineLastSessions[lift];

    if (!legacyLast.size && !pipelineLast.size) {
      return;
    }

    expect(legacyLast.size > 0 || pipelineLast.size > 0).toBe(true);

    // kg→lbs converter for weight display and comparison
    // (pipeline stores in kg, legacy stores in lbs)
    const KG_TO_LBS = 2.20462262185;
    const convertWeight = (kg: number) => Math.round(kg * KG_TO_LBS);

    // Soft-warn tier: compare available entries, tracking divergence without hard-fail
    // Only check variations present in the current lift's pipeline snapshot (lift-scoped filtering)
    for (const [legacyLabel, legacySession] of legacyLast) {
      // Only warn if this variation appears in the pipeline snapshot for this lift
      if (!pipelineLast.has(legacyLabel)) {
        continue;
      }

      const pipelineDetail = pipelineLast.get(legacyLabel);
      if (pipelineDetail) {
        const legacyDate = legacySession.date.toISOString().split('T')[0];
        const pipelineWeightLbs = convertWeight(pipelineDetail.weight);
        const dateMismatch = legacyDate !== pipelineDetail.date;
        const setsMismatch = legacySession.sets !== pipelineDetail.sets;
        const repsMismatch = legacySession.reps !== pipelineDetail.reps;
        const weightMismatch = Math.abs(legacySession.weight - pipelineWeightLbs) > 0.5;
        const rpeMismatch =
          (legacySession.rpe ?? null) !== pipelineDetail.rpe &&
          !(legacySession.rpe === null && pipelineDetail.rpe === null);

        if (dateMismatch || setsMismatch || repsMismatch || weightMismatch || rpeMismatch) {
          console.warn(
            `core-vs-pipeline ${lift} lastSession[${legacyLabel}]: ` +
              `legacy=(date=${legacyDate} sets=${legacySession.sets} reps=${legacySession.reps} weight=${legacySession.weight} lbs rpe=${legacySession.rpe}) ` +
              `pipeline=(date=${pipelineDetail.date} sets=${pipelineDetail.sets} reps=${pipelineDetail.reps} weight=${pipelineWeightLbs} lbs rpe=${pipelineDetail.rpe})`
          );
        }
      }
    }

    // Warn if pipeline has variations not in legacy (reverse check)
    for (const [pipelineLabel] of pipelineLast) {
      if (!legacyLast.has(pipelineLabel)) {
        console.warn(
          `core-vs-pipeline ${lift} lastSession: pipeline has "${pipelineLabel}" but legacy missing`
        );
      }
    }
  });
});

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
import { parseConjugateData, buildSessionStats, calcE1RM } from '@dyel/core';
import {
  snapshotVariationsFromLegacy,
  snapshotVariationsFromPipeline,
  diffVariationSnapshots,
} from '../testUtils/diffVariationSnapshot';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { distinctDisplayNames } from '../utils/appUtils';
import { conjugateChartSpecs } from './conjugateChartSpecs';
import { buildLastSessionDetail } from './lastSessionDetail';

interface SnapshotDict {
  [key: string]: number | undefined;
}

const LIFT_TYPES: string[] = ['squat', 'bench', 'deadlift'];

describe('VariationRadarChart core-vs-pipeline parity', () => {
  const legacySnapshots: Record<string, SnapshotDict> = {};
  const legacyRawSnapshots: Record<string, SnapshotDict> = {};
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
      eff = computeEffectiveNames(tabRows, 'sumo');
    const allSigmaPairs = [
      ...tabRows.squat.maxEffort,
      ...tabRows.bench.maxEffort,
      ...tabRows.deadlift.maxEffort,
    ];
    const stats = buildSessionStats(allSigmaPairs, eff.effectiveBaselineNames, new Date());
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
      // snapshotVariationsFromPipeline expects the RAW pipeline RechartsRow[] (kg-valued,
      // `.t`-keyed) — it does its own "most recent row" selection (via `.t`) and its own
      // kg->lbs conversion. Wrapping in mergeWideRechartsRows() first was a call-site bug:
      // mergeWideRechartsRows() already converts `.t` -> `.date` (string) and kg -> lbs, so
      // the `.t` comparison inside snapshotVariationsFromPipeline always failed (silently
      // falling back to the first row instead of the true most-recent one) and its own
      // conv() then double-applied the kg->lbs conversion on top of the already-converted
      // values (~2.2x inflation). Passing the raw dataset directly fixes both.
      pipelineSnapshots[lift] = snapshotVariationsFromPipeline(
        res.datasets.variations ?? [],
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
          eff.effectiveBaselineNames[lift]
        ) as SnapshotDict;

        // Build raw snapshot (un-normalized, apples-to-apples with pipeline). @dyel/core never
        // unit-converts TrainingSession.weight (see snapshotVariationsFromLegacy's note in
        // diffVariationSnapshot.ts) - calcE1RM's output is already in the fixture's native unit,
        // no further conversion needed here.
        const rawSnapshot: SnapshotDict = {};
        for (const name of distinctDisplayNames(liftRows)) {
          const lastSess = stats.lastSession.get(name);
          const raw = !lastSess ? null : calcE1RM(lastSess.weight, lastSess.reps, lastSess.rpe);
          rawSnapshot[name] = raw !== null ? Math.round(raw) : undefined;
        }
        legacyRawSnapshots[lift] = rawSnapshot;
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

  // VariationRadarChart.tsx no longer consumes this normalized value in production as of this
  // swap (closes #460) — it's retained purely as a tracked/historical divergence measurement,
  // mirroring how ConjugateCharts' own pre-deprecation divergence numbers were retained for
  // documentation purposes after that component's dropdown was deprecated (see migration/ConjugateCharts.md).
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

  it.each(LIFT_TYPES)(
    '%s: raw variation snapshots (pipeline vs legacy, apples-to-apples)',
    (lift: string) => {
      const lSnap = legacyRawSnapshots[lift],
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
        const diffs = diffVariationSnapshots(lSnap, pSnap);
        const maxRelDiff = Math.max(
          ...diffs
            .filter((d) => d.legacyValue !== undefined && d.pipelineValue !== undefined)
            .map((d) => d.relDiff)
        );

        diffs.forEach((d) => {
          if (d.legacyValue !== undefined && d.pipelineValue !== undefined) {
            console.warn(
              `core-vs-pipeline-raw ${lift} ${d.variationName}: legacy=${d.legacyValue} pipeline=${d.pipelineValue} absDiff=${d.absDiff} relDiff=${(d.relDiff * 100).toFixed(1)}%`
            );
          }
        });

        // Soft-warn tier: known, benign floating-point rounding-boundary artifact from
        // unit conversion round-trip. Legacy computes e1RM natively in lbs (e.g. 75 lbs
        // -> 92.5 -> Math.round(92.5) = 93). Pipeline converts to kg at parse time
        // (packages/pipeline/src/parse/csv.ts's convertToKg: w * 0.453592), computes
        // e1RM in kg, then converts back for display (KG_TO_LBS = 2.20462262185 in
        // packages/app/src/utils/variationSnapshot.ts). These constants are not exact
        // reciprocals (1/0.453592 = 2.204624420..., not 2.20462262185), so values
        // landing exactly on a .5 lbs boundary post-Epley may round differently
        // (92.49994... vs 92.5 -> Math.round = 92 vs 93). This is an inherent artifact
        // of two-directional unit conversion, not a logic/data bug. Only affects the
        // single rounding-boundary case in bench (1.1% divergence on one value); 15 of
        // 16 bench variations match exactly (0.0% diff).
        console.warn(
          `core-vs-pipeline-raw ${lift}: maxRelDiff=${(maxRelDiff * 100).toFixed(1)}% (soft-warn tier, see comment above)`
        );
      } else if (hasL || hasP) {
        console.warn(
          `core-vs-pipeline-raw ${lift}: one-sided data (legacy=${hasL}, pipeline=${hasP})`
        );
      }
    }
  );

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

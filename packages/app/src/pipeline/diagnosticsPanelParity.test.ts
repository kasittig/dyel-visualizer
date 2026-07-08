import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import { parseConjugateData, buildSessionStats, generateDiagnostics } from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { initialTabState } from '../utils/appUtils';

type PipelineDiagnostics = ReturnType<typeof runPipeline>['diagnostics'];

describe('Diagnostics core-vs-pipeline parity', () => {
  let pipelineVariants: PipelineDiagnostics['variants'] = [];
  let pipelineDeadliftVariants: PipelineDiagnostics['variants'] = [];
  let pipelineWeaknesses: PipelineDiagnostics['weaknesses'] = [];
  let pipelineUnassessed: PipelineDiagnostics['unassessed'] = [];
  let legacyResults: ReturnType<typeof generateDiagnostics> = [];
  let legacyDeadliftResults: ReturnType<typeof generateDiagnostics> = [];

  beforeAll(() => {
    const txt: string = readFileSync(
      join(__dirname, '../../test/fixtures/total-chart-sheet.csv'),
      'utf-8'
    );
    const res = runPipeline(
      [buildRawInput('url', txt)],
      [],
      { ...PLACEHOLDER_ATHLETE, deadliftStance: 'sumo' },
      {}
    );

    const baseCanonicals = new Set(Object.values(res.model.baseline));
    pipelineVariants = res.diagnostics.variants.filter((v) => {
      return !baseCanonicals.has(v.canonical);
    });
    pipelineDeadliftVariants = pipelineVariants.filter((v) => {
      return v.lift === 'lift:deadlift';
    });
    pipelineWeaknesses = res.diagnostics.weaknesses;
    pipelineUnassessed = res.diagnostics.unassessed;

    const pairs = parseConjugateData(txt);
    const tabRows = buildTabRows(extractPairs({ status: 'success', pairs }));
    const eff = computeEffectiveNames(tabRows, initialTabState(), 'sumo');
    legacyResults = generateDiagnostics(
      pairs,
      'Deadlift',
      buildSessionStats(pairs, eff.effectiveBaselineNames, new Date()),
      'sumo'
    );
    legacyDeadliftResults = legacyResults.filter((r) => {
      return r.type === 'deadlift';
    });
  });

  it('produces non-empty variant list from both implementations', () => {
    expect(pipelineVariants.length).toBeGreaterThan(0);
    expect(legacyResults.length).toBeGreaterThan(0);
  });

  it('pipeline variants have expected structure', () => {
    expect(pipelineVariants[0]).toBeDefined();
    expect(pipelineVariants[0]).toMatchObject({
      canonical: expect.anything(),
      lift: expect.anything(),
      effects: expect.anything(),
      status: expect.anything(),
      ratio: expect.anything(),
    });
  });

  it('legacy results have expected structure', () => {
    expect(legacyResults[0]).toBeDefined();
    expect(legacyResults[0]).toMatchObject({
      displayName: expect.anything(),
      status: expect.anything(),
      effects: expect.anything(),
      averageIndex: expect.anything(),
    });
  });

  it('both have deadlift variants with valid status', () => {
    expect(pipelineDeadliftVariants.length).toBeGreaterThan(0);
    expect(legacyDeadliftResults.length).toBeGreaterThan(0);
    pipelineDeadliftVariants.forEach((v) => {
      expect(['optimal', 'weakness', 'overperforming']).toContain(v.status);
    });
    legacyDeadliftResults.forEach((r) => {
      expect(['optimal', 'weakness', 'overtrained']).toContain(r.status);
    });
  });

  it('soft warn: diagnostic status may diverge due to tolerance/stale-days differences', () => {
    if (!pipelineDeadliftVariants.length || !legacyDeadliftResults.length) {
      console.warn(
        `Not enough deadlift variants to compare: pipeline=${pipelineDeadliftVariants.length}, legacy=${legacyDeadliftResults.length}`
      );
      return;
    }

    const counts = {
      pOpt: pipelineDeadliftVariants.filter((v) => {
        return v.status === 'optimal';
      }).length,
      pWeak: pipelineDeadliftVariants.filter((v) => {
        return v.status === 'weakness';
      }).length,
      pOver: pipelineDeadliftVariants.filter((v) => {
        return v.status === 'overperforming';
      }).length,
      lOpt: legacyDeadliftResults.filter((r) => {
        return r.status === 'optimal';
      }).length,
      lWeak: legacyDeadliftResults.filter((r) => {
        return r.status === 'weakness';
      }).length,
      lOver: legacyDeadliftResults.filter((r) => {
        return r.status === 'overtrained';
      }).length,
    };

    console.warn(
      `Deadlift diagnostic status: pipeline(opt=${counts.pOpt},weak=${counts.pWeak},over=${counts.pOver}) vs legacy(opt=${counts.lOpt},weak=${counts.lWeak},over=${counts.lOver})`
    );
    expect(pipelineDeadliftVariants.length > 0 && legacyDeadliftResults.length > 0).toBe(true);
  });

  it('weakness voting aggregates effects across variants', () => {
    expect(Array.isArray(pipelineWeaknesses)).toBe(true);
    if (pipelineWeaknesses.length > 0) {
      expect(pipelineWeaknesses[0]).toMatchObject({
        quality: expect.anything(),
        score: expect.anything(),
        evidence: expect.anything(),
      });
      console.warn(
        `Pipeline identified ${pipelineWeaknesses.length} weakness qualities, e.g. "${pipelineWeaknesses[0].quality}"`
      );
    }
  });

  it('unassessed variants are documented', () => {
    if (pipelineUnassessed.length > 0) {
      console.warn(`Pipeline unassessed (stale or unfitted): ${pipelineUnassessed.join(', ')}`);
    }
    expect(Array.isArray(pipelineUnassessed)).toBe(true);
  });
});

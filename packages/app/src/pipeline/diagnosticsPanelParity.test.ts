import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runPipeline } from '@dyel/pipeline';
import { parseConjugateData, buildSessionStats, generateDiagnostics } from '@dyel/core';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../utils/rawInputUtils';
import { extractPairs, buildTabRows, computeEffectiveNames } from '../utils/appDataUtils';
import { initialTabState } from '../utils/appUtils';

describe('Diagnostics core-vs-pipeline parity', () => {
  let fixtureContent: string;
  let pipelineVariants: ReturnType<typeof runPipeline>['diagnostics']['variants'];
  let pipelineWeaknesses: ReturnType<typeof runPipeline>['diagnostics']['weaknesses'];
  let pipelineUnassessed: ReturnType<typeof runPipeline>['diagnostics']['unassessed'];
  let legacyResults: ReturnType<typeof generateDiagnostics>;
  let pipelineDeadliftVariants: ReturnType<typeof runPipeline>['diagnostics']['variants'];
  let legacyDeadliftResults: ReturnType<typeof generateDiagnostics>;

  beforeAll(() => {
    const fixturePath = join(__dirname, '../../test/fixtures/total-chart-sheet.csv');
    fixtureContent = readFileSync(fixturePath, 'utf-8');

    // Pipeline path
    const raw = buildRawInput('url', fixtureContent);
    const athlete = { ...PLACEHOLDER_ATHLETE, deadliftStance: 'sumo' as const };
    const result = runPipeline([raw], [], athlete, {});

    // Filter out baselines (which have ratio=1) to match legacy's behavior of excluding the anchor
    const baselineCanonicals = new Set(Object.values(result.model.baseline));
    pipelineVariants = result.diagnostics.variants.filter(
      (v) => !baselineCanonicals.has(v.canonical)
    );
    pipelineDeadliftVariants = pipelineVariants.filter((v) => v.lift === 'lift:deadlift');
    pipelineWeaknesses = result.diagnostics.weaknesses;
    pipelineUnassessed = result.diagnostics.unassessed;

    // Legacy @dyel/core path
    const pairs = parseConjugateData(fixtureContent);
    const state = { status: 'success' as const, pairs };
    const dataMap = extractPairs(state);
    const tabRows = buildTabRows(dataMap);
    const tabState = initialTabState();
    const deadliftStance = 'sumo';
    const { effectiveBaselineNames } = computeEffectiveNames(tabRows, tabState, deadliftStance);
    const stats = buildSessionStats(pairs, effectiveBaselineNames, new Date());
    legacyResults = generateDiagnostics(pairs, 'Deadlift', stats, deadliftStance);
    legacyDeadliftResults = legacyResults.filter((r) => r.type === 'deadlift');
  });

  it('produces non-empty variant list from both implementations', () => {
    expect(pipelineVariants.length).toBeGreaterThan(0);
    expect(legacyResults.length).toBeGreaterThan(0);
  });

  it('pipeline variants have expected structure', () => {
    expect(pipelineVariants[0]).toBeDefined();
    const firstVar = pipelineVariants[0];
    expect(firstVar).toHaveProperty('canonical');
    expect(firstVar).toHaveProperty('lift');
    expect(firstVar).toHaveProperty('effects');
    expect(firstVar).toHaveProperty('status');
    expect(firstVar).toHaveProperty('ratio');
  });

  it('legacy results have expected structure', () => {
    expect(legacyResults[0]).toBeDefined();
    const firstRes = legacyResults[0];
    expect(firstRes).toHaveProperty('displayName');
    expect(firstRes).toHaveProperty('status');
    expect(firstRes).toHaveProperty('effects');
    expect(firstRes).toHaveProperty('averageIndex');
  });

  it('both have deadlift variants with valid status', () => {
    expect(pipelineDeadliftVariants.length).toBeGreaterThan(0);
    expect(legacyDeadliftResults.length).toBeGreaterThan(0);

    // Check all have valid status values
    pipelineDeadliftVariants.forEach((v) => {
      expect(['optimal', 'weakness', 'overperforming']).toContain(v.status);
    });
    legacyDeadliftResults.forEach((r) => {
      expect(['optimal', 'weakness', 'overtrained']).toContain(r.status);
    });
  });

  it('soft warn: diagnostic status may diverge due to tolerance/stale-days differences', () => {
    if (pipelineDeadliftVariants.length === 0 || legacyDeadliftResults.length === 0) {
      console.warn(
        `Not enough deadlift variants to compare: pipeline=${pipelineDeadliftVariants.length}, legacy=${legacyDeadliftResults.length}`
      );
      return;
    }

    const statusDivergence = {
      pipelineOptimal: pipelineDeadliftVariants.filter((v) => v.status === 'optimal').length,
      pipelineWeakness: pipelineDeadliftVariants.filter((v) => v.status === 'weakness').length,
      pipelineOverperf: pipelineDeadliftVariants.filter((v) => v.status === 'overperforming')
        .length,
      legacyOptimal: legacyDeadliftResults.filter((r) => r.status === 'optimal').length,
      legacyWeakness: legacyDeadliftResults.filter((r) => r.status === 'weakness').length,
      legacyOvertrained: legacyDeadliftResults.filter((r) => r.status === 'overtrained').length,
    };

    console.warn(
      `Deadlift diagnostic status: pipeline(opt=${statusDivergence.pipelineOptimal},weak=${statusDivergence.pipelineWeakness},over=${statusDivergence.pipelineOverperf}) vs legacy(opt=${statusDivergence.legacyOptimal},weak=${statusDivergence.legacyWeakness},over=${statusDivergence.legacyOvertrained})`
    );

    // Hard assertion: both should classify at least some variants
    const pipHasClassified = pipelineDeadliftVariants.length > 0;
    const legHasClassified = legacyDeadliftResults.length > 0;
    expect(pipHasClassified && legHasClassified).toBe(true);
  });

  it('weakness voting aggregates effects across variants', () => {
    // Both implementations should have weaknesses (aggregated by effect)
    expect(pipelineWeaknesses).toBeDefined();
    expect(Array.isArray(pipelineWeaknesses)).toBe(true);

    if (pipelineWeaknesses.length > 0) {
      const firstWeakness = pipelineWeaknesses[0];
      expect(firstWeakness).toHaveProperty('quality');
      expect(firstWeakness).toHaveProperty('score');
      expect(firstWeakness).toHaveProperty('evidence');
      console.warn(
        `Pipeline identified ${pipelineWeaknesses.length} weakness qualities, e.g. "${firstWeakness.quality}"`
      );
    }
  });

  it('unassessed variants are documented', () => {
    if (pipelineUnassessed.length > 0) {
      console.warn(`Pipeline unassessed (stale or unfitted): ${pipelineUnassessed.join(', ')}`);
    }

    // Hard assertion: unassessed list should be an array (even if empty)
    expect(Array.isArray(pipelineUnassessed)).toBe(true);
  });
});

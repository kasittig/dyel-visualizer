import { useMemo } from 'react';
import type { RenderParams, LastSessionDetail, buildRadarRows } from '@dyel/api';
import {
  buildLastSessionDetail,
  snapshotVariationsFromPipeline,
  snapshotNormalizedVariationsFromPipeline,
  buildCanonicalByLabel,
  resolveTargetLabel,
  conjugateChartSpecs,
  buildRadarRows as makeRadarRows,
} from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';
import { usePipelineDatasets } from '../sigma';

export interface PipelineVariationRadarData {
  snapshot: Record<string, number | undefined>;
  normalizedSnapshot: Record<string, number | undefined>;
  lastSessionByLabel: Map<string, LastSessionDetail>;
  targetLabel: string | undefined;
  canonicalByLabel: Map<string, string>;
  data: ReturnType<typeof buildRadarRows>;
}

const EMPTY: PipelineVariationRadarData = {
  snapshot: {},
  normalizedSnapshot: {},
  lastSessionByLabel: new Map(),
  targetLabel: undefined,
  canonicalByLabel: new Map(),
  data: [],
};
const UI: RenderParams = {};

export function usePipelineVariationRadarData(
  liftType: string,
  unit: 'lbs' | 'kg',
  targetCanonical?: string
): PipelineVariationRadarData {
  const { status, model } = usePipelineModel();
  const specs = useMemo(() => conjugateChartSpecs(liftType), [liftType]);
  const datasets = usePipelineDatasets(specs, UI);

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }
    const canonicalByLabel = buildCanonicalByLabel(model.tagged, liftType);
    const normalizedSnapshot = snapshotNormalizedVariationsFromPipeline(
      datasets.variationsAdjusted ?? [],
      canonicalByLabel,
      model.model,
      unit
    );
    const targetLabel = resolveTargetLabel(model.tagged, liftType, targetCanonical);

    return {
      snapshot: snapshotVariationsFromPipeline(datasets.variations ?? [], unit),
      normalizedSnapshot,
      lastSessionByLabel: buildLastSessionDetail(model.tagged, liftType),
      targetLabel,
      canonicalByLabel,
      data: makeRadarRows(normalizedSnapshot, targetLabel),
    };
  }, [status, model, datasets, unit, liftType, targetCanonical]);
}

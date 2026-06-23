import { useState, useMemo } from 'react';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import { useLastSessionStats } from '../../hooks/data/useLastSessionStats';
import { ConjugateCharts } from '../conjugate/ConjugateCharts';
import { DiagnosticsPanel } from '../shared/DiagnosticsPanel';
import { VariationRadarChart } from '../charts/VariationRadarChart';
import { applyFilters } from '@dyel/core';
import type { DeadliftStancePreference, FilterState, LiftType } from '@dyel/core';

export function LiftTabPanel({
  rows,
  filters,
  effectiveBaselineNames,
  targetName,
  baselineName,
  onTargetChange,
  deadliftStance,
  onDeadliftStanceChange,
}: {
  rows: ConjugateDataPair[];
  filters: FilterState;
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  targetName: string;
  baselineName?: string;
  onTargetChange: (name: string | null) => void;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
}) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  const filteredRows = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const stats = useLastSessionStats(filteredRows, effectiveBaselineNames);

  function handleVariationClick(variation: string) {
    setSelectedVariation((v) => (v === variation ? null : variation));
  }

  return (
    <>
      <ConjugateCharts
        rows={filteredRows}
        baselineNames={effectiveBaselineNames}
        stats={stats}
        targetName={targetName}
        onTargetChange={onTargetChange}
        highlightedVariation={selectedVariation}
        onVariationClick={handleVariationClick}
      />
      <VariationRadarChart
        rows={filteredRows}
        stats={stats}
        targetName={targetName}
        baselineName={baselineName}
        onVariationClick={handleVariationClick}
      />
      <DiagnosticsPanel
        rows={filteredRows}
        targetName={targetName}
        onTargetChange={onTargetChange}
        deadliftStance={deadliftStance}
        onDeadliftStanceChange={onDeadliftStanceChange}
      />
    </>
  );
}

import { useState } from 'react';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import type { SessionStats } from '../../hooks/data/useLastSessionStats';
import { ConjugateCharts } from '../conjugate/ConjugateCharts';
import { DiagnosticsPanel } from '../shared/DiagnosticsPanel';
import { VariationRadarChart } from '../charts/VariationRadarChart';

import type { LiftType } from '@dyel/core';

export function LiftTabPanel({
  filteredRows,
  effectiveBaselineNames,
  chartStats,
  targetName,
  onTargetChange,
}: {
  filteredRows: ConjugateDataPair[];
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  chartStats: SessionStats;
  targetName: string | null;
  onTargetChange: (name: string | null) => void;
}) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  function handleVariationClick(variation: string) {
    setSelectedVariation((v) => (v === variation ? null : variation));
  }

  return (
    <>
      <ConjugateCharts
        rows={filteredRows}
        baselineNames={effectiveBaselineNames}
        stats={chartStats}
        targetName={targetName}
        onTargetChange={onTargetChange}
        highlightedVariation={selectedVariation}
        onVariationClick={handleVariationClick}
      />
      <VariationRadarChart
        rows={filteredRows}
        stats={chartStats}
        onVariationClick={handleVariationClick}
      />
      <DiagnosticsPanel
        rows={filteredRows}
        targetName={targetName}
        onTargetChange={onTargetChange}
      />
    </>
  );
}

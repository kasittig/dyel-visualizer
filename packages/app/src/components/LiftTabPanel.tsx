import { useState } from 'react';
import type { ConjugateDataPair } from '../hooks/useConjugateData';
import type { SessionStats } from '../hooks/useLastSessionStats';
import { ConjugateCharts } from './ConjugateCharts';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { VariationRadarChart } from './VariationRadarChart';
import type { LiftType } from '../utils/appUtils';

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
      <DiagnosticsPanel rows={filteredRows} />
    </>
  );
}

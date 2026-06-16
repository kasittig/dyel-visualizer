import { useState } from "react";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import type { SessionStats } from "../hooks/useLastSessionStats";
import { usePerLiftCorrelation } from "../hooks/useCorrelationData";
import { ConjugateCharts } from "./ConjugateCharts";
import { VariationRadarChart } from "./VariationRadarChart";
import { CorrelationMatrix } from "./CorrelationMatrix";
import type { LiftType } from "../utils/appUtils";

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
  const { matrix, sampleMatrix, variantNames } = usePerLiftCorrelation(filteredRows);

  const liftType = filteredRows[0]?.[0].type as LiftType | undefined;
  const baselineName = liftType ? effectiveBaselineNames[liftType] : undefined;
  const competitionLabels = baselineName ? new Set([baselineName]) : undefined;

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
      <CorrelationMatrix
        matrix={matrix}
        sampleMatrix={sampleMatrix}
        labels={variantNames}
        competitionLabels={competitionLabels}
      />
    </>
  );
}

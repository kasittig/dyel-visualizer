import { useState, useMemo } from 'react';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import { useLastSessionStats } from '../../hooks/data/useLastSessionStats';
import { ConjugateCharts } from '../conjugate/ConjugateCharts';
import { DiagnosticsPanel } from '../shared/DiagnosticsPanel';
import { VariationRadarChart } from '../charts/VariationRadarChart';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EditableDateChip } from '../shared/EditableDateChip';
import { filterByDateRange } from '@dyel/core';
import type { DateRange } from 'react-day-picker';
import type { DeadliftStancePreference, LiftType } from '@dyel/core';
import type { InputMode } from '../../utils/appUtils';

export function LiftTabPanel({
  rows,
  effectiveBaselineNames,
  liftType,
  targetName,
  baselineName,
  deadliftStance,
  onDeadliftStanceChange,
  dateRange,
  onDateRangeChange,
  inputMode,
  url,
  pastedText,
  refreshToken,
  unit,
}: {
  rows: ConjugateDataPair[];
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  liftType: LiftType;
  targetName: string;
  baselineName?: string;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  inputMode: InputMode;
  url: string;
  pastedText: string;
  refreshToken: number;
  unit: 'lbs' | 'kg';
}) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  const filteredRows = useMemo(
    () => filterByDateRange(rows, dateRange.from, dateRange.to),
    [rows, dateRange]
  );
  const stats = useLastSessionStats(filteredRows, effectiveBaselineNames);

  function handleVariationClick(variation: string | null) {
    setSelectedVariation((v) => (variation === null || v === variation ? null : variation));
  }

  const label = liftType.charAt(0).toUpperCase() + liftType.slice(1);

  return (
    <>
      <CollapsibleSection
        label={`${label} performance`}
        trailing={<EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />}
      >
        <ConjugateCharts
          liftType={liftType}
          inputMode={inputMode}
          url={url}
          pastedText={pastedText}
          refreshToken={refreshToken}
          unit={unit}
          highlightedVariation={selectedVariation}
          onVariationClick={handleVariationClick}
        />
      </CollapsibleSection>
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
        deadliftStance={deadliftStance}
        onDeadliftStanceChange={onDeadliftStanceChange}
        onVariationClick={handleVariationClick}
        highlightedVariation={selectedVariation}
        variantFactor={stats.variantFactor}
        addlWtOffset={stats.addlWtOffset}
      />
    </>
  );
}

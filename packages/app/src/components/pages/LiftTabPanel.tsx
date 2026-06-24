import { useState, useMemo } from 'react';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import { useLastSessionStats } from '../../hooks/data/useLastSessionStats';
import { ConjugateCharts } from '../conjugate/ConjugateCharts';
import { DiagnosticsPanel } from '../shared/DiagnosticsPanel';
import { VariationRadarChart } from '../charts/VariationRadarChart';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EditableDateChip } from '../shared/EditableDateChip';
import { applyFilters, filterByDateRange } from '@dyel/core';
import type { DateRange } from 'react-day-picker';
import type { DeadliftStancePreference, FilterState, LiftType } from '@dyel/core';

export function LiftTabPanel({
  rows,
  filters,
  effectiveBaselineNames,
  liftType,
  targetName,
  baselineName,
  onTargetChange,
  deadliftStance,
  onDeadliftStanceChange,
  dateRange,
  onDateRangeChange,
}: {
  rows: ConjugateDataPair[];
  filters: FilterState;
  effectiveBaselineNames: Partial<Record<LiftType, string>>;
  liftType: LiftType;
  targetName: string;
  baselineName?: string;
  onTargetChange: (name: string | null) => void;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  const filteredRows = useMemo(
    () => filterByDateRange(applyFilters(rows, filters), dateRange.from, dateRange.to),
    [rows, filters, dateRange]
  );
  const stats = useLastSessionStats(filteredRows, effectiveBaselineNames);

  function handleVariationClick(variation: string) {
    setSelectedVariation((v) => (v === variation ? null : variation));
  }

  const label = liftType.charAt(0).toUpperCase() + liftType.slice(1);

  return (
    <>
      <CollapsibleSection
        label={`${label} performance`}
        trailing={<EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />}
      >
        <ConjugateCharts
          rows={filteredRows}
          baselineNames={effectiveBaselineNames}
          stats={stats}
          targetName={targetName}
          onTargetChange={onTargetChange}
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
        onTargetChange={onTargetChange}
        deadliftStance={deadliftStance}
        onDeadliftStanceChange={onDeadliftStanceChange}
      />
    </>
  );
}

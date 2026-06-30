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
import styles from './LiftTabPanel.module.css';

export function LiftTabPanel({
  rows,
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
    () => filterByDateRange(rows, dateRange.from, dateRange.to),
    [rows, dateRange]
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
      <div className={styles.chartCard}>
        <span className={styles.sectionLabel}>Variation Breakdown</span>
        <VariationRadarChart
          rows={filteredRows}
          stats={stats}
          targetName={targetName}
          baselineName={baselineName}
          onVariationClick={handleVariationClick}
        />
      </div>
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

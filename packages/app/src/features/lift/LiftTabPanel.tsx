import { useState } from 'react';
import { ConjugateCharts } from './ConjugateCharts';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { VariationRadarChart } from './VariationRadarChart';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import { EditableDateChip } from '../../shared/components/EditableDateChip';
import type { DateRange } from 'react-day-picker';
import type { DeadliftStancePreference } from '../../app/appTabs';

export function LiftTabPanel({
  liftType,
  targetName,
  deadliftStance,
  onDeadliftStanceChange,
  resolvedDeadliftStance,
  dateRange,
  onDateRangeChange,
  unit,
}: {
  liftType: string;
  targetName: string;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
  resolvedDeadliftStance?: 'sumo' | 'conventional';
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  unit: 'lbs' | 'kg';
}) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  const handleVariationClick = (variation: string | null) => {
    setSelectedVariation((v) => (variation === null || v === variation ? null : variation));
  };

  return (
    <>
      <CollapsibleSection
        label={`${liftType.charAt(0).toUpperCase() + liftType.slice(1)} performance`}
        trailing={<EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />}
      >
        <ConjugateCharts
          liftType={liftType}
          dateRange={dateRange}
          unit={unit}
          highlightedVariation={selectedVariation}
          onVariationClick={handleVariationClick}
        />
      </CollapsibleSection>
      <VariationRadarChart
        liftType={liftType}
        unit={unit}
        targetName={targetName}
        onVariationClick={handleVariationClick}
      />
      <DiagnosticsPanel
        liftType={liftType}
        deadliftStance={deadliftStance}
        onDeadliftStanceChange={onDeadliftStanceChange}
        resolvedDeadliftStance={resolvedDeadliftStance}
        onVariationClick={handleVariationClick}
        highlightedVariation={selectedVariation}
        unit={unit}
      />
    </>
  );
}

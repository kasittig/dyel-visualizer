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
  dateRange,
  onDateRangeChange,
  unit,
}: {
  liftType: string;
  targetName: string;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  unit: 'lbs' | 'kg';
}) {
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

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
        onVariationClick={handleVariationClick}
        highlightedVariation={selectedVariation}
        unit={unit}
      />
    </>
  );
}

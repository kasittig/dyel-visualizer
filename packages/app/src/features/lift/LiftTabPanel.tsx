import { useState } from 'react';
import { ConjugateCharts } from './ConjugateCharts';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { VariationRadarChart } from './VariationRadarChart';
import { AccessoryTable } from './AccessoryTable';
import { CollapsibleSection, EditableDateChip } from '../../shared/components';
import type { DateRange } from 'react-day-picker';

export function LiftTabPanel({
  liftType,
  targetName,
  dateRange,
  onDateRangeChange,
  unit,
}: {
  liftType: string;
  targetName: string;
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
        persistenceId={`visualizer:${liftType}:performance`}
        summary="e1RM history by variation"
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
        onVariationClick={handleVariationClick}
        highlightedVariation={selectedVariation}
        unit={unit}
      />
      {liftType === 'accessory' && (
        <AccessoryTable
          unit={unit}
          dateRange={dateRange}
          highlightedVariation={selectedVariation}
          onVariationClick={handleVariationClick}
        />
      )}
    </>
  );
}

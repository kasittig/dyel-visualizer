import type { DateRange } from 'react-day-picker';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import { EditableDateChip } from '../../shared/components/EditableDateChip';
import { useSigmaChartData } from './useSigmaChartData';
import { TotalChart } from './TotalChart';
import { SessionBarChart } from './SessionBarChart';
import { SigmaChart } from './SigmaChart';

export function SigmaTab({
  dateRange,
  onDateRangeChange,
  unit,
  volumeByDate,
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  unit: 'lbs' | 'kg';
  volumeByDate: Map<string, number>;
}) {
  const chartData = useSigmaChartData(dateRange, unit, volumeByDate);

  return (
    <>
      <CollapsibleSection
        label="Overview"
        trailing={<EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />}
      >
        <TotalChart chartData={chartData} unit={unit} />
      </CollapsibleSection>
      <SigmaChart chartData={chartData} unit={unit} />
      <CollapsibleSection label="Total Volume">
        <SessionBarChart chartData={chartData} unit={unit} />
      </CollapsibleSection>
    </>
  );
}

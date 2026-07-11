import type { DateRange } from 'react-day-picker';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EditableDateChip } from '../shared/EditableDateChip';
import { useSigmaChartData } from '../../hooks/pipeline/useSigmaChartData';
import { TotalChart } from '../charts/TotalChart';
import { SessionBarChart } from '../charts/SessionBarChart';
import { SigmaChart } from '../charts/SigmaChart';

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

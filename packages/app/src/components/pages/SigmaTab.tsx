import type { DateRange } from 'react-day-picker';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EditableDateChip } from '../shared/EditableDateChip';
import { usePipelineTotalChartData } from '../../hooks/pipeline/usePipelineTotalChartData';
import { mergeVolumeIntoChartPoints } from '@dyel/api';
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
  const pipelineChartData = usePipelineTotalChartData(dateRange, unit);

  const chartData = mergeVolumeIntoChartPoints(pipelineChartData, volumeByDate);

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

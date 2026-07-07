import type { DateRange } from 'react-day-picker';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EditableDateChip } from '../shared/EditableDateChip';
import { usePipelineTotalChartData } from '../../hooks/pipeline/usePipelineTotalChartData';
import { mergeVolumeIntoChartPoints } from '../../utils/pipelineChartUtils';
import { TotalChart } from '../charts/TotalChart';
import { SessionBarChart } from '../charts/SessionBarChart';
import { SigmaChart } from '../charts/SigmaChart';
import type { InputMode } from '../../utils/appUtils';

export function SigmaTab({
  inputMode,
  url,
  pastedText,
  refreshToken,
  dateRange,
  onDateRangeChange,
  unit,
  volumeByDate,
}: {
  inputMode: InputMode;
  url: string;
  pastedText: string;
  refreshToken: number;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  unit: 'lbs' | 'kg';
  volumeByDate: Map<string, number>;
}) {
  const pipelineChartData = usePipelineTotalChartData(
    inputMode,
    url,
    pastedText,
    refreshToken,
    dateRange,
    unit
  );

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

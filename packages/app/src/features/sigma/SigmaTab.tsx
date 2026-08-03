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
  const latest = chartData.at(-1);
  const overviewSummary = latest?.total
    ? `Latest total: ${latest.total} ${unit} · ${chartData.length} dates`
    : chartData.length
      ? `${chartData.length} dates in range`
      : 'No data in range';
  let volumeSessions = 0;
  for (const { squat, bench, deadlift, volume } of chartData) {
    if (squat || bench || deadlift || volume) {
      volumeSessions += 1;
    }
  }

  return (
    <>
      <CollapsibleSection
        label="Overview"
        persistenceId="visualizer:sigma:overview"
        summary={overviewSummary}
        trailing={<EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />}
      >
        <TotalChart chartData={chartData} unit={unit} />
      </CollapsibleSection>
      <SigmaChart chartData={chartData} unit={unit} />
      <CollapsibleSection
        label="Total Volume"
        persistenceId="visualizer:sigma:total-volume"
        summary={volumeSessions ? `${volumeSessions} sessions in range` : 'No data in range'}
      >
        <SessionBarChart chartData={chartData} unit={unit} />
      </CollapsibleSection>
    </>
  );
}

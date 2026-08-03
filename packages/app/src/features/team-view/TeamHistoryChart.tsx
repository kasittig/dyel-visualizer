import { useCallback } from 'react';
import clsx from 'clsx';
import type { DisplayUnit, Point } from '@dyel/api';
import type { DateRange } from 'react-day-picker';
import { MultiSeriesLineChart, ChartEmpty } from '../../shared/charts';
import { DateRangePicker } from '../../shared/components';
import { useTeamHistoryChartData } from './useTeamHistoryChartData';
import styles from './TeamHistoryChart.module.css';

export function TeamHistoryChart({
  pointsByLifter,
  unit,
  dateRange,
  onDateRangeChange,
  sessionDates,
  onClose,
}: {
  pointsByLifter: Map<string, Point[]>;
  unit: DisplayUnit;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  sessionDates: Date[];
  onClose: () => void;
}) {
  const { lifters, data } = useTeamHistoryChartData(pointsByLifter, unit);

  const tooltip = useCallback(
    (item: { name: string; value: unknown; color?: string }) => ({
      key: item.name,
      name: item.name,
      color: item.color,
      detail: `e1RM: ${item.value} ${unit}`,
    }),
    [unit]
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={clsx(styles.sectionLabel, styles.headerLabel)}>
          History across lifters
        </span>
        <DateRangePicker
          value={dateRange}
          onChange={onDateRangeChange}
          sessionDates={sessionDates}
        />
        <button
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close chart"
        >
          ✕
        </button>
      </div>
      {lifters.length === 0 ? (
        <ChartEmpty />
      ) : (
        <MultiSeriesLineChart
          data={data}
          unit={unit}
          seriesKeys={lifters}
          tooltip={tooltip}
          summary={`Estimated one-rep max history for ${lifters.length} lifters across ${data.length} training dates in ${unit}.`}
        />
      )}
    </div>
  );
}

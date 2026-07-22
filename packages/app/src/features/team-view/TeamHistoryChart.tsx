import { useCallback } from 'react';
import clsx from 'clsx';
import type { DisplayUnit, Point } from '@dyel/api';
import { NORMALIZED_KEY_SUFFIX, LINE_COLORS } from '@dyel/api';
import type { DateRange } from 'react-day-picker';
import { Line } from 'recharts';
import { MultiSeriesLineChart, ChartEmpty } from '../../shared/charts';
import { DateRangePicker } from '../../shared/components';
import { useTeamHistoryChartData } from './useTeamHistoryChartData';
import styles from './TeamHistoryChart.module.css';

export function TeamHistoryChart({
  pointsByLifter,
  normalizedPointsByLifter,
  unit,
  dateRange,
  onDateRangeChange,
  sessionDates,
  onClose,
}: {
  pointsByLifter: Map<string, Point[]>;
  normalizedPointsByLifter: Map<string, Point[]>;
  unit: DisplayUnit;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  sessionDates: Date[];
  onClose: () => void;
}) {
  const { lifters, data } = useTeamHistoryChartData(pointsByLifter, unit, normalizedPointsByLifter);

  const tooltip = useCallback(
    (item: { name: string; value: unknown; color?: string }) => {
      const isNormalized = item.name.endsWith(NORMALIZED_KEY_SUFFIX);
      const name = isNormalized
        ? `${item.name.slice(0, -NORMALIZED_KEY_SUFFIX.length)} (normalized)`
        : item.name;
      return { key: item.name, name, color: item.color, detail: `e1RM: ${item.value} ${unit}` };
    },
    [unit]
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={clsx(styles.sectionLabel, styles.headerLabel)}>
          History Across Lifters
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
          extraChildren={lifters.map((name, i) =>
            (normalizedPointsByLifter.get(name)?.length ?? 0) > 0 ? (
              <Line
                key={`${name}${NORMALIZED_KEY_SUFFIX}`}
                type="monotone"
                dataKey={`${name}${NORMALIZED_KEY_SUFFIX}`}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              />
            ) : null
          )}
        />
      )}
    </div>
  );
}

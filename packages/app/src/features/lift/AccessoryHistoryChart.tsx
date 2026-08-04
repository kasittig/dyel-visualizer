import type { DateRange } from 'react-day-picker';
import type { DisplayUnit } from '@dyel/api';
import { MultiSeriesLineChart } from '../../shared/charts';
import { useAccessoryHistory } from './useAccessoryHistory';
import styles from './AccessoryHistoryChart.module.css';

export function AccessoryHistoryChart({
  exerciseId,
  exerciseLabel,
  dateRange,
  unit,
}: {
  exerciseId: string;
  exerciseLabel: string;
  dateRange: DateRange;
  unit: DisplayUnit;
}) {
  const history = useAccessoryHistory(exerciseId, unit, dateRange);
  if (!history) {
    return null;
  }

  return (
    <section className={styles.card} aria-labelledby="accessory-history-heading">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Accessory history</span>
          <h3 id="accessory-history-heading">{exerciseLabel}</h3>
        </div>
        <span className={styles.metric}>{history.metricLabel}</span>
      </div>
      {history.data.length ? (
        <MultiSeriesLineChart
          data={history.data.map((point) => ({
            ...point,
            [history.metricLabel]: point.value,
          }))}
          unit={history.unitLabel}
          seriesKeys={[history.metricLabel]}
          summary={`${history.metricLabel} history for ${exerciseLabel} across ${history.data.length} training dates, measured in ${history.unitLabel}. Tap a point to inspect its value.`}
          tooltip={(item) => ({
            key: history.metric,
            name: history.metricLabel,
            color: item.color,
            detail: `${item.value} ${history.unitLabel}`,
          })}
        />
      ) : (
        <p className={styles.empty} role="status">
          No {history.metricLabel.toLowerCase()} data for {exerciseLabel} in this date range. Widen
          the range to view its recorded history.
        </p>
      )}
      {history.data.length === 1 && (
        <p className={styles.note}>One session is available; log another to reveal a trend.</p>
      )}
    </section>
  );
}

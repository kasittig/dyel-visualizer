import type { DateRange } from 'react-day-picker';
import { Line } from 'recharts';
import { usePipelineConjugateChartData, NORMALIZED_KEY } from './usePipelineConjugateChartData';
import { MultiSeriesLineChart, ChartEmpty } from '../../shared/charts';
import styles from './ConjugateCharts.module.css';

export function ConjugateCharts({
  liftType,
  dateRange,
  unit,
  highlightedVariation = null,
  onVariationClick,
}: {
  liftType: string;
  dateRange: DateRange;
  unit: 'lbs' | 'kg';
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}) {
  const { variations, data, showNormalized, bestSetByLabelAndDate } = usePipelineConjugateChartData(
    liftType,
    dateRange,
    unit
  );

  if (variations.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <div className={styles.card}>
      <span className={styles.sectionLabel}>e1RM history</span>
      <MultiSeriesLineChart
        data={data}
        unit={unit}
        seriesKeys={variations}
        highlightedKey={highlightedVariation}
        onKeyClick={onVariationClick}
        summary={`Estimated one-rep max history for ${liftType}, comparing ${variations.length} variations across ${data.length} training dates in ${unit}. Tap a point to inspect its value.`}
        extraChildren={
          showNormalized && (
            <Line
              key={NORMALIZED_KEY}
              type="monotone"
              dataKey={NORMALIZED_KEY}
              name="Normalized e1RM"
              stroke="var(--chart-blue)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          )
        }
        tooltip={(item, isoDate) => {
          const best =
            item.name !== NORMALIZED_KEY
              ? bestSetByLabelAndDate.get(item.name)?.get(isoDate)
              : undefined;
          return {
            key: item.name,
            name: item.name,
            color: item.color,
            detail: `e1RM: ${item.value} ${unit}`,
            extra: best
              ? `${best.sets}×${best.reps} @ ${best.weight} ${unit}${best.rpe != null ? ` · RPE ${best.rpe}` : ''}`
              : undefined,
          };
        }}
      />
    </div>
  );
}

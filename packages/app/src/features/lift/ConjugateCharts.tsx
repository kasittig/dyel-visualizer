import { useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import { Line, Tooltip } from 'recharts';
import { LINE_COLORS } from '@dyel/api';
import { usePipelineConjugateChartData, NORMALIZED_KEY } from './usePipelineConjugateChartData';
import { DateLineChart, ChartEmpty } from '../../shared/charts/DateLineChart';
import { ChartTooltip } from '../../shared/charts/TooltipCard';
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

  const tooltipContent = useCallback(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: readonly {
        name?: unknown;
        value?: unknown;
        color?: string;
        payload?: { date: string };
      }[];
      label?: string | number;
    }) => {
      if (!active || !payload?.length) {
        return null;
      }
      const isoDate = payload[0].payload!.date;
      return (
        <ChartTooltip
          label={label}
          lines={payload.map((item) => {
            const name = String(item.name);
            const best =
              name !== NORMALIZED_KEY ? bestSetByLabelAndDate.get(name)?.get(isoDate) : undefined;
            return {
              key: name,
              name,
              color: item.color,
              detail: `e1RM: ${item.value} ${unit}`,
              extra: best
                ? `${best.sets}×${best.reps} @ ${best.weight} ${unit}${best.rpe != null ? ` · RPE ${best.rpe}` : ''}`
                : undefined,
            };
          })}
        />
      );
    },
    [bestSetByLabelAndDate, unit]
  );

  if (variations.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <div className={styles.card}>
      <span className={styles.sectionLabel}>e1RM History</span>
      <DateLineChart data={data} unit={unit}>
        <Tooltip content={tooltipContent} />
        {showNormalized && (
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
        )}
        {variations.map((label, i) => {
          const isHigh = highlightedVariation === label;
          const click = onVariationClick ? () => onVariationClick(label) : undefined;
          return (
            <Line
              key={label}
              type="monotone"
              dataKey={label}
              stroke={isHigh ? 'var(--text-h)' : LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={isHigh ? 3 : 1.5}
              dot={{ r: isHigh ? 4 : 3 }}
              activeDot={{
                r: 5,
                onClick: click,
                style: { cursor: onVariationClick ? 'pointer' : undefined },
              }}
              onClick={click}
              style={{ cursor: onVariationClick ? 'pointer' : undefined }}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </DateLineChart>
    </div>
  );
}

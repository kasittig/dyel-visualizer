import { useCallback } from 'react';
import { Line, Tooltip } from 'recharts';
import { LINE_COLORS } from '@dyel/core';
import type { RepCalcStats } from '@dyel/core';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import {
  useConjugateChartData,
  NORMALIZED_KEY,
  NORMALIZED_COLOR,
  NORMALIZED_LABEL,
} from '../../hooks/conjugate/useConjugateChartData';
import { DateLineChart, ChartEmpty } from '../charts/DateLineChart';
import { TooltipCard } from '../charts/TooltipCard';
import styles from './ConjugateCharts.module.css';

export function ConjugateCharts({
  rows,
  baselineNames = {},
  stats,
  targetName,
  onTargetChange,
  highlightedVariation = null,
  onVariationClick,
}: {
  rows: ConjugateDataPair[];
  baselineNames?: Partial<Record<string, string>>;
  stats: RepCalcStats;
  targetName: string | null;
  onTargetChange: (name: string) => void;
  highlightedVariation?: string | null;
  onVariationClick?: (variation: string) => void;
}) {
  const unit = rows[0]?.[1].unit ?? 'lbs';

  const {
    variations,
    data,
    showNormalized,
    bestSetByLabelAndDate,
    baselineExercise,
    effectiveTargetName,
  } = useConjugateChartData(rows, baselineNames, stats, targetName);

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
        <TooltipCard>
          <div className={styles.tooltipDate}>{label}</div>
          {payload.map((item) => {
            const name = String(item.name);
            const bestSet =
              name !== NORMALIZED_KEY ? bestSetByLabelAndDate.get(name)?.get(isoDate) : undefined;
            return (
              <div key={name} className={styles.tooltipItem}>
                <div style={{ color: item.color }}>{name}</div>
                <div>
                  e1RM: {String(item.value)} {unit}
                </div>
                {bestSet && (
                  <div className={styles.tooltipMuted}>
                    {bestSet.sets}×{bestSet.reps} @ {bestSet.weight} {unit}
                    {bestSet.rpe != null ? ` · RPE ${bestSet.rpe}` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </TooltipCard>
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
      {baselineExercise && (
        <div className={styles.targetRow}>
          <label>
            Competition variation:{' '}
            <select
              value={effectiveTargetName ?? ''}
              onChange={(e) => onTargetChange(e.target.value)}
              className={styles.targetSelect}
            >
              {variations.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <DateLineChart data={data} unit={unit}>
        <Tooltip content={tooltipContent} />
        {showNormalized && (
          <Line
            key={NORMALIZED_KEY}
            type="monotone"
            dataKey={NORMALIZED_KEY}
            name={NORMALIZED_LABEL}
            stroke={NORMALIZED_COLOR}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        )}
        {variations.map((label, i) => {
          const isHighlighted = highlightedVariation === label;
          const stroke = isHighlighted ? 'var(--text-h)' : LINE_COLORS[i % LINE_COLORS.length];
          const handleClick = onVariationClick ? () => onVariationClick(label) : undefined;
          return (
            <Line
              key={label}
              type="monotone"
              dataKey={label}
              stroke={stroke}
              strokeWidth={isHighlighted ? 3 : 1.5}
              dot={{ r: isHighlighted ? 4 : 3 }}
              activeDot={{
                r: 5,
                onClick: handleClick,
                style: { cursor: onVariationClick ? 'pointer' : undefined },
              }}
              onClick={handleClick}
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

import { useCallback } from 'react';
import { Line, Tooltip } from 'recharts';
import { LINE_COLORS } from '@dyel/core';
import type { InputMode } from '../../utils/appUtils';
import {
  useConjugateChartData,
  NORMALIZED_KEY,
  NORMALIZED_COLOR,
  NORMALIZED_LABEL,
} from '../../hooks/conjugate/useConjugateChartData';
import { DateLineChart, ChartEmpty } from '../charts/DateLineChart';
import { ChartTooltip } from '../charts/TooltipCard';
import styles from './ConjugateCharts.module.css';

export function ConjugateCharts({
  liftType,
  inputMode,
  url,
  pastedText,
  refreshToken,
  unit,
  highlightedVariation = null,
  onVariationClick,
}: {
  liftType: string;
  inputMode: InputMode;
  url: string;
  pastedText: string;
  refreshToken: number;
  unit: 'lbs' | 'kg';
  highlightedVariation?: string | null;
  onVariationClick?: (variation: string) => void;
}) {
  const { variations, data, showNormalized } = useConjugateChartData(
    liftType,
    inputMode,
    url,
    pastedText,
    refreshToken,
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
      return (
        <ChartTooltip
          label={label}
          lines={payload.map((item) => {
            const name = String(item.name);
            return {
              key: name,
              name,
              color: item.color,
              detail: `e1RM: ${item.value} ${unit}`,
            };
          })}
        />
      );
    },
    [unit]
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

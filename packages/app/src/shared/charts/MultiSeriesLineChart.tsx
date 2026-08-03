import { useCallback, useState } from 'react';
import { Line, Tooltip } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { LINE_COLORS } from '@dyel/api/display';
import { DateLineChart } from './DateLineChart';
import { ChartTooltip, type TooltipLine } from './TooltipCard';
import { ChartLegend } from './ChartLegend';
import { TOUCH_EXPLORATION_QUERY, useMediaQuery } from '../hooks';

export interface MultiSeriesLineChartProps {
  data: ChartPoint[];
  unit: 'lbs' | 'kg';
  seriesKeys: string[];
  tooltip: (item: { name: string; value: unknown; color?: string }, isoDate: string) => TooltipLine;
  highlightedKey?: string | null;
  onKeyClick?: (key: string) => void;
  extraChildren?: React.ReactNode;
  yAxisWidth?: number;
  height?: number;
  summary?: string;
}

export function MultiSeriesLineChart({
  data,
  unit,
  seriesKeys,
  tooltip,
  highlightedKey = null,
  onKeyClick,
  extraChildren,
  yAxisWidth,
  height,
  summary,
}: MultiSeriesLineChartProps) {
  const touch = useMediaQuery(TOUCH_EXPLORATION_QUERY);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());
  const visibleKeys = seriesKeys.filter((key) => !hiddenKeys.has(key));
  const accessibleSummary = [
    summary,
    visibleKeys.length
      ? `Visible series: ${visibleKeys.join(', ')}.`
      : 'All series are hidden.',
  ]
    .filter(Boolean)
    .join(' ');
  const toggleKey = useCallback((key: string) => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);
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
          lines={payload.map((item) =>
            tooltip({ name: String(item.name), value: item.value, color: item.color }, isoDate)
          )}
        />
      );
    },
    [tooltip]
  );

  return (
    <>
      <ChartLegend
        items={seriesKeys.map((key, i) => ({
          key,
          label: key,
          color: LINE_COLORS[i % LINE_COLORS.length],
        }))}
        hiddenKeys={hiddenKeys}
        onToggle={toggleKey}
      />
      <DateLineChart
        data={data}
        unit={unit}
        yAxisWidth={yAxisWidth}
        height={height}
        summary={accessibleSummary}
      >
        <Tooltip content={tooltipContent} trigger={touch ? 'click' : 'hover'} />
        {extraChildren}
        {seriesKeys.map((key, i) => {
          const isHigh = highlightedKey === key;
          const click = onKeyClick ? () => onKeyClick(key) : undefined;
          return (
            <Line
              key={key}
              hide={hiddenKeys.has(key)}
              type="monotone"
              dataKey={key}
              stroke={isHigh ? 'var(--text-h)' : LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={isHigh ? 3 : 1.5}
              dot={{ r: isHigh ? 4 : 3 }}
              activeDot={{
                r: 5,
                onClick: click,
                style: { cursor: onKeyClick ? 'pointer' : undefined },
              }}
              onClick={click}
              style={{ cursor: onKeyClick ? 'pointer' : undefined }}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </DateLineChart>
    </>
  );
}

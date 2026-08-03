import type React from 'react';
import type { ComponentProps } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Text,
} from 'recharts';
import styles from './BaseRadarChart.module.css';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../hooks';

interface CustomAxisTickProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  textAnchor: 'start' | 'middle' | 'end' | 'inherit';
  payload: { value: string; coordinate: number; index: number };
}

const renderCustomAxis = (props: CustomAxisTickProps): React.JSX.Element => {
  const { payload, x, y, cx, cy, textAnchor } = props;
  return (
    <Text
      x={x + (x - cx) / 10}
      y={y + (y - cy) / 10}
      textAnchor={textAnchor}
      className="recharts-polar-angle-axis-tick-value"
      fontSize={11}
      fill="var(--text)"
    >
      {payload.value}
    </Text>
  );
};

type RechartsTickParam = NonNullable<ComponentProps<typeof PolarAngleAxis>['tick']>;

export function BaseRadarChart({
  label,
  data,
  angleKey,
  unit,
  tooltip = {},
  onClick,
  chartKey,
  overlayDataKey,
  summary,
}: {
  label?: string;
  data: object[];
  angleKey: string;
  unit: string;
  tooltip?: ComponentProps<typeof Tooltip>;
  onClick?: (label: string) => void;
  chartKey?: string | number;
  overlayDataKey?: string;
  summary?: string;
}) {
  const mobile = useMediaQuery(MOBILE_LAYOUT_QUERY);
  return (
    <section
      className={styles.section}
      role={summary ? 'img' : undefined}
      aria-label={summary || undefined}
    >
      {label && <p className={styles.label}>{label}</p>}
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={mobile ? 280 : 340}>
          <RadarChart
            key={chartKey}
            data={data}
            style={{ cursor: onClick ? 'pointer' : undefined }}
            onClick={
              onClick
                ? (chartData) => {
                    const name = chartData?.activeLabel;
                    if (typeof name === 'string' && name) {
                      onClick(name);
                    }
                  }
                : undefined
            }
          >
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey={angleKey}
              tick={(props: RechartsTickParam) => renderCustomAxis(props as CustomAxisTickProps)}
            />
            <PolarRadiusAxis
              tick={{ fontSize: 10, fill: 'var(--text)' }}
              unit={` ${unit}`}
              angle={90}
              stroke="none"
            />
            <Radar
              dataKey="e1rm"
              stroke="var(--chart-1-cyan)"
              fill="var(--chart-1-cyan)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            {overlayDataKey && (
              <Radar
                dataKey={overlayDataKey}
                stroke="var(--chart-2-pink)"
                fill="none"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            )}
            <Tooltip {...tooltip} trigger={mobile ? 'click' : 'hover'} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

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

// 1. Explicitly type every value as required to satisfy the "defined value" rule
interface CustomAxisTickProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  textAnchor: 'start' | 'middle' | 'end' | 'inherit';
  payload: {
    value: string;
    coordinate: number;
    index: number;
  };
}

// 2. Type the function parameter using the absolute expected type
const renderCustomAxis = (props: CustomAxisTickProps): React.JSX.Element => {
  const { payload, x, y, cx, cy, textAnchor } = props;

  // Push labels 10% out from center coordinates
  const offsetX = x + (x - cx) / 10;
  const offsetY = y + (y - cy) / 10;

  return (
    <Text
      x={offsetX}
      y={offsetY}
      textAnchor={textAnchor}
      className="recharts-polar-angle-axis-tick-value" // Matches internal style sheets
      fontSize={11}
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
}: {
  label: string;
  data: object[];
  angleKey: string;
  unit: string;
  tooltip?: React.ComponentProps<typeof Tooltip>;
  onClick?: (label: string) => void;
}) {
  return (
    <section className={styles.section}>
      <p className={styles.label}>{label}</p>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart
            data={data}
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
            style={{ cursor: onClick ? 'pointer' : undefined }}
          >
            <PolarGrid />
            <PolarAngleAxis
              dataKey={angleKey}
              tick={(props: RechartsTickParam) => renderCustomAxis(props as CustomAxisTickProps)}
            />
            <PolarRadiusAxis tick={{ fontSize: 10 }} unit={` ${unit}`} angle={90} />
            <Radar dataKey="e1rm" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Tooltip {...tooltip} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

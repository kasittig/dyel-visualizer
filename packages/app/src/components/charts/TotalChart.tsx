import { Line, Tooltip } from 'recharts';
import type { ChartPoint } from '@dyel/core';
import { DateLineChart, ChartEmpty } from './DateLineChart';
import styles from './TotalChart.module.css';

const SQUAT_COLOR = '#e74c3c';
const BENCH_COLOR = '#3498db';
const DEADLIFT_COLOR = '#f1c40f';
const PUSH_PULL_COLOR = '#2ecc71';
const TOTAL_COLOR = '#9b59b6';

export function TotalChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  if (chartData.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <div className={styles.card}>
      <DateLineChart data={chartData} unit={unit} yAxisWidth={55}>
        <Tooltip formatter={(v, name) => [`${v} ${unit}`, String(name)]} />
        <Line
          type="monotone"
          dataKey="squat"
          name="Squat"
          stroke={SQUAT_COLOR}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="bench"
          name="Bench"
          stroke={BENCH_COLOR}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="deadlift"
          name="Deadlift"
          stroke={DEADLIFT_COLOR}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="pushPull"
          name="Push/Pull"
          stroke={PUSH_PULL_COLOR}
          strokeDasharray="5 5"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="total"
          name="Est. Total"
          stroke={TOTAL_COLOR}
          strokeDasharray="5 5"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
      </DateLineChart>
    </div>
  );
}

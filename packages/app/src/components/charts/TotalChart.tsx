import { Line, Tooltip } from 'recharts';
import type { ChartPoint } from '@dyel/core';
import { DateLineChart, ChartEmpty } from './DateLineChart';

const SQUAT_COLOR = '#e67e22';
const BENCH_COLOR = '#3498db';
const DEADLIFT_COLOR = '#2ecc71';
const TOTAL_COLOR = '#9b59b6';

export function TotalChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  if (chartData.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <section>
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
          dataKey="total"
          name="Est. Total"
          stroke={TOTAL_COLOR}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
      </DateLineChart>
    </section>
  );
}

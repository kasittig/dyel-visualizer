import { Line, Tooltip } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { DateLineChart, ChartEmpty } from '../../shared/charts/DateLineChart';
import { ChartTooltip } from '../../shared/charts/TooltipCard';
import styles from './TotalChart.module.css';
import {
  SQUAT_COLOR,
  BENCH_COLOR,
  DEADLIFT_COLOR,
  TOTAL_COLOR,
  PUSH_PULL_COLOR,
} from '../../shared/charts/colors.ts';

export function TotalChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  if (chartData.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <div className={styles.card}>
      <span className={styles.sectionLabel}>e1RM Over Time</span>
      <DateLineChart data={chartData} unit={unit} yAxisWidth={55}>
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) {
              return null;
            }
            return (
              <ChartTooltip
                label={label}
                lines={payload.map((item) => ({
                  key: String(item.dataKey),
                  detail: (
                    <span style={{ color: item.color }}>
                      {item.name}: {item.value} {unit}
                    </span>
                  ),
                }))}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="squat"
          name="Squat"
          stroke={SQUAT_COLOR}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          strokeDasharray="3 4"
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
          strokeDasharray="7 7"
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
          strokeDasharray="3 3"
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

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate } from '@dyel/core';
import type { ChartPoint } from '@dyel/core';
import { ChartEmpty } from './DateLineChart';
import { ChartTooltip } from './TooltipCard';
import styles from './SessionBarChart.module.css';

import { SQUAT_COLOR, BENCH_COLOR, DEADLIFT_COLOR, PUSH_PULL_COLOR } from './colors.ts';

export function SessionBarChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  if (chartData.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <div className={styles.card}>
      <span className={styles.sectionLabel}>Session Volume</span>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} unit={` ${unit}`} />
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
          <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
          <Bar dataKey="squat" name="Squat" fill={SQUAT_COLOR} />
          <Bar dataKey="bench" name="Bench" fill={BENCH_COLOR} />
          <Bar dataKey="deadlift" name="Deadlift" fill={DEADLIFT_COLOR} />
          <Bar dataKey="volume" name="Accessory Volume" fill={PUSH_PULL_COLOR} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

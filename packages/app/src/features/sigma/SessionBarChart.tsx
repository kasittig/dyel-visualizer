import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { formatChartDate } from '@dyel/api/display';
import { ChartEmpty } from '../../shared/charts/DateLineChart';
import { ChartTooltip } from '../../shared/charts/TooltipCard';
import styles from './SessionBarChart.module.css';
import {
  SQUAT_COLOR,
  BENCH_COLOR,
  DEADLIFT_COLOR,
  PUSH_PULL_COLOR,
} from '../../shared/charts/colors.ts';
import { ChartLegend } from '../../shared/charts/ChartLegend';
import { formatMobileChartDate, useMobileChart } from '../../shared/charts/useMobileChart';

export function SessionBarChart({ chartData, unit }: { chartData: ChartPoint[]; unit: string }) {
  const mobile = useMobileChart();
  if (chartData.length === 0) {
    return <ChartEmpty />;
  }

  return (
    <div className={styles.card}>
      <span className={styles.sectionLabel}>Session Volume</span>
      <ChartLegend
        items={[
          { key: 'squat', label: 'Squat', color: SQUAT_COLOR },
          { key: 'bench', label: 'Bench', color: BENCH_COLOR },
          { key: 'deadlift', label: 'Deadlift', color: DEADLIFT_COLOR },
          { key: 'volume', label: 'Accessory', color: PUSH_PULL_COLOR },
        ]}
      />
      <div
        role="img"
        aria-label={`Session training volume across ${chartData.length} dates, split into squat, bench, deadlift, and accessory volume in ${unit}.`}
      >
        <ResponsiveContainer width="100%" height={mobile ? 250 : 300}>
          <BarChart
            data={chartData}
            margin={
              mobile
                ? { top: 4, right: 4, bottom: 22, left: -8 }
                : { top: 4, right: 16, bottom: 40, left: 0 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={mobile ? formatMobileChartDate : formatChartDate}
              angle={mobile ? 0 : -45}
              textAnchor={mobile ? 'middle' : 'end'}
              interval="preserveStartEnd"
              minTickGap={mobile ? 48 : 20}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              unit={` ${unit}`}
              width={mobile ? 42 : 60}
              tickCount={mobile ? 5 : undefined}
            />
            <Tooltip
              trigger={mobile ? 'click' : 'hover'}
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
            <Bar dataKey="squat" name="Squat" fill={SQUAT_COLOR} />
            <Bar dataKey="bench" name="Bench" fill={BENCH_COLOR} />
            <Bar dataKey="deadlift" name="Deadlift" fill={DEADLIFT_COLOR} />
            <Bar dataKey="volume" name="Accessory Volume" fill={PUSH_PULL_COLOR} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

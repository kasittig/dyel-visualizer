import type React from 'react';
import { CartesianGrid, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { formatChartDate } from '@dyel/api/display';
import styles from './DateLineChart.module.css';
import { formatMobileChartDate, useMobileChart } from './useMobileChart';

export function ChartEmpty() {
  return (
    <section>
      <p className={styles.emptyMsg}>No data found.</p>
    </section>
  );
}

export function DateLineChart({
  data,
  unit,
  yAxisWidth = 45,
  height = 300,
  children,
  summary,
}: {
  data: ChartPoint[];
  unit: string;
  yAxisWidth?: number;
  height?: number;
  children: React.ReactNode;
  summary?: string;
}) {
  const mobile = useMobileChart();
  return (
    <div className={styles.chartWrapper} role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height={mobile ? Math.min(height, 260) : height}>
        <LineChart
          data={data}
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
            width={mobile ? Math.min(yAxisWidth, 42) : yAxisWidth}
            unit={` ${unit}`}
            tickCount={mobile ? 5 : undefined}
          />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

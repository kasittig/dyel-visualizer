import type React from 'react';
import { CartesianGrid, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { ChartPoint } from '@dyel/api';
import { formatChartDate } from '@dyel/api/display';
import styles from './DateLineChart.module.css';

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
}: {
  data: ChartPoint[];
  unit: string;
  yAxisWidth?: number;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            angle={-45}
            textAnchor="end"
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} width={yAxisWidth} unit={` ${unit}`} />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

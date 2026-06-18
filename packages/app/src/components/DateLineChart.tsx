import type React from "react";
import { CartesianGrid, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatDate } from "@dyel/core";
import type { ChartPoint } from "@dyel/core";

/** The "No data found." placeholder shared by the time-series charts. */
export function ChartEmpty() {
  return (
    <section>
      <p style={{ color: "var(--text)" }}>No data found.</p>
    </section>
  );
}

/**
 * Shared shell for the date-indexed line charts: the centered responsive container, a
 * date X axis (formatted, angled), and a unit-suffixed Y axis. Callers supply the
 * `<Tooltip>` and `<Line>` children.
 */
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
    <div style={{ width: "80%", margin: "0 auto" }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
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

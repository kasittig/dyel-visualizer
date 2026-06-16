import type React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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
    <section style={{ marginTop: "1rem" }}>
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--text)",
          marginBottom: "0.25rem",
          textAlign: "center",
        }}
      >
        {label}
      </p>
      <div style={{ width: "80%", margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart
            data={data}
            onClick={
              onClick
                ? (chartData) => {
                    const name = chartData?.activeLabel;
                    if (typeof name === "string" && name) onClick(name);
                  }
                : undefined
            }
            style={{ cursor: onClick ? "pointer" : undefined }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey={angleKey} tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} unit={` ${unit}`} />
            <Radar dataKey="e1rm" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Tooltip {...tooltip} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

import { useCallback } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LINE_COLORS, formatDate } from "@dyel/core";
import type { RepCalcStats } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import {
  useConjugateChartData,
  NORMALIZED_KEY,
  NORMALIZED_COLOR,
  NORMALIZED_LABEL,
} from "../hooks/useConjugateChartData";

export function ConjugateCharts({
  rows,
  baselineNames = {},
  stats,
  targetName,
  onTargetChange,
  highlightedVariation = null,
  onVariationClick,
}: {
  rows: ConjugateDataPair[];
  baselineNames?: Partial<Record<string, string>>;
  stats: RepCalcStats;
  targetName: string | null;
  onTargetChange: (name: string) => void;
  highlightedVariation?: string | null;
  onVariationClick?: (variation: string) => void;
}) {
  const unit = rows[0]?.[1].unit ?? "lbs";

  const {
    variations,
    data,
    showNormalized,
    bestSetByLabelAndDate,
    baselineExercise,
    effectiveTargetName,
  } = useConjugateChartData(rows, baselineNames, stats, targetName);

  const tooltipContent = useCallback(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: readonly {
        name?: unknown;
        value?: unknown;
        color?: string;
        payload?: { date: string };
      }[];
      label?: string | number;
    }) => {
      if (!active || !payload?.length) return null;
      const isoDate = payload[0].payload!.date;
      return (
        <div
          style={{
            background: "var(--bg, #fff)",
            border: "1px solid var(--border, #ccc)",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: "0.8rem",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>{label}</div>
          {payload.map((item) => {
            const name = String(item.name);
            const bestSet =
              name !== NORMALIZED_KEY ? bestSetByLabelAndDate.get(name)?.get(isoDate) : undefined;
            return (
              <div key={name} style={{ marginTop: "0.2rem" }}>
                <div style={{ color: item.color }}>{name}</div>
                <div>
                  e1RM: {String(item.value)} {unit}
                </div>
                {bestSet && (
                  <div style={{ opacity: 0.7 }}>
                    {bestSet.sets}×{bestSet.reps} @ {bestSet.weight} {unit}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [bestSetByLabelAndDate, unit]
  );

  if (variations.length === 0) {
    return (
      <section>
        <p style={{ color: "var(--text)" }}>No data found.</p>
      </section>
    );
  }

  return (
    <section>
      {baselineExercise && (
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text)",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          <label>
            Normalize to:{" "}
            <select
              value={effectiveTargetName ?? ""}
              onChange={(e) => onTargetChange(e.target.value)}
              style={{ fontSize: "0.8rem" }}
            >
              {variations.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div style={{ width: "80%", margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height={300}>
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
            <YAxis tick={{ fontSize: 11 }} width={45} unit={` ${unit}`} />
            <Tooltip content={tooltipContent} />
            {showNormalized && (
              <Line
                key={NORMALIZED_KEY}
                type="monotone"
                dataKey={NORMALIZED_KEY}
                name={NORMALIZED_LABEL}
                stroke={NORMALIZED_COLOR}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
            {variations.map((label, i) => {
              const isHighlighted = highlightedVariation === label;
              const stroke = isHighlighted ? "var(--text-h)" : LINE_COLORS[i % LINE_COLORS.length];
              const handleClick = onVariationClick ? () => onVariationClick(label) : undefined;
              return (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={stroke}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  dot={{ r: isHighlighted ? 4 : 3 }}
                  activeDot={{
                    r: 5,
                    onClick: handleClick,
                    style: { cursor: onVariationClick ? "pointer" : undefined },
                  }}
                  onClick={handleClick}
                  style={{ cursor: onVariationClick ? "pointer" : undefined }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

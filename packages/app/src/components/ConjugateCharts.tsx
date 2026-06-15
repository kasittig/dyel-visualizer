import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, LINE_COLORS } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

export function ConjugateCharts({
  rows,
  hidden,
}: {
  rows: ConjugateDataPair[];
  hidden: Set<string>;
}) {
  const [legendOpen, setLegendOpen] = useState(false);

  const unit = rows[0]?.[1].unit ?? "lbs";

  // label → date → best e1RM, plus derived chart data — recomputed only when rows changes
  const { variations, data } = useMemo(() => {
    const e1rmByLabelAndDate = new Map<string, Map<string, number>>();

    for (const [exercise, session] of rows) {
      const label = exercise.displayName;
      const date = session.date.toISOString().slice(0, 10);
      if (!e1rmByLabelAndDate.has(label)) e1rmByLabelAndDate.set(label, new Map());
      const byDate = e1rmByLabelAndDate.get(label)!;
      const prev = byDate.get(date);
      if (prev === undefined || session.e1rm > prev) byDate.set(date, session.e1rm);
    }

    const variations = [...e1rmByLabelAndDate.keys()].sort();

    const allDates = [
      ...new Set([...e1rmByLabelAndDate.values()].flatMap((m) => [...m.keys()])),
    ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const data = allDates.map((date) => {
      const point: Record<string, string | number> = { date, label: formatDate(date) };
      for (const variation of variations) {
        const e1rm = e1rmByLabelAndDate.get(variation)?.get(date);
        if (e1rm !== undefined) point[variation] = Math.round(e1rm);
      }
      return point;
    });

    return { variations, data };
  }, [rows]);

  // Shared by both the legend and <Line> elements — recomputed only when variations or hidden changes
  const visibleVariations = useMemo(
    () => variations.map((label, i) => ({ label, i })).filter(({ label }) => !hidden.has(label)),
    [variations, hidden]
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
      <button
        onClick={() => setLegendOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: "0.8rem",
          color: "var(--text)",
          marginBottom: legendOpen ? "0.5rem" : "0.75rem",
        }}
      >
        {legendOpen ? "▲" : "▼"} Legend
      </button>
      {legendOpen && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.2rem 1.5rem",
            fontSize: "0.8rem",
            marginBottom: "0.75rem",
          }}
        >
          {visibleVariations.map(({ label, i }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 3,
                  background: LINE_COLORS[i % LINE_COLORS.length],
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ width: "80%", margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              angle={-45}
              textAnchor="end"
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} width={45} unit={` ${unit}`} />
            <Tooltip formatter={(v, name) => [`${v} ${unit}`, String(name)]} />
            {visibleVariations.map(({ label, i }) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

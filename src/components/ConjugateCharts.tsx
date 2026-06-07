import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SheetRow } from "../hooks/useSheetData";
import { findCol } from "../hooks/useSheetData";
import type { ConjugateLift } from "../types/conjugate";
import { calcE1RM } from "../utils/calcE1RM";
import { conjugateLiftLabel, parseConjugateLift } from "../utils/parseConjugate";
import type { AttrFilter } from "../utils/conjugateFilter";
import { meetsFilter } from "../utils/conjugateFilter";

const LINE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
];

function formatDate(str: string): string {
  const d = new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

export function ConjugateCharts({
  rows,
  liftType,
  hidden,
  attributeFilter,
}: {
  rows: SheetRow[];
  liftType: ConjugateLift["liftType"];
  hidden: Set<string>;
  attributeFilter: Map<string, AttrFilter>;
}) {
  // label → date → best e1RM
  const e1rmByLabelAndDate = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const parsed = parseConjugateLift(row["exercise"]?.trim() ?? "");
    if (!parsed || parsed.liftType !== liftType) continue;
    if (!meetsFilter(parsed, attributeFilter)) continue;
    const date = row["date"]?.trim();
    if (!date) continue;
    const weight = parseFloat(findCol(row, "weight") ?? "");
    const reps = parseFloat(row["reps"] ?? "");
    if (isNaN(weight) || isNaN(reps) || reps <= 0) continue;

    const label = conjugateLiftLabel(parsed);
    const e1rm = calcE1RM(weight, reps);
    if (!e1rmByLabelAndDate.has(label)) e1rmByLabelAndDate.set(label, new Map());
    const byDate = e1rmByLabelAndDate.get(label)!;
    const prev = byDate.get(date);
    if (prev === undefined || e1rm > prev) byDate.set(date, e1rm);
  }

  if (e1rmByLabelAndDate.size === 0) {
    return (
      <section>
        <p style={{ color: "#6b7280" }}>No {liftType} data found.</p>
      </section>
    );
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

  return (
    <section>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.2rem 1.5rem",
          fontSize: "0.8rem",
          marginBottom: "0.75rem",
        }}
      >
        {variations
          .map((label, i) => ({ label, i }))
          .filter(({ label }) => !hidden.has(label))
          .map(({ label, i }) => (
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
          <YAxis tick={{ fontSize: 11 }} width={45} unit=" lbs" />
          <Tooltip formatter={(v, name) => [`${v} lbs`, String(name)]} />
          {variations
            .map((label, i) => ({ label, i }))
            .filter(({ label }) => !hidden.has(label))
            .map(({ label, i }) => (
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
    </section>
  );
}

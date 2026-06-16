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
import { formatDate, LINE_COLORS, normalizeToBaseE1RM } from "@dyel/core";
import type { ConjugateExercise, RepCalcStats } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

const NORMALIZED_KEY = "__normalized__";
const NORMALIZED_COLOR = "#3b82f6";
const NORMALIZED_LABEL = "Normalized e1RM";

export function ConjugateCharts({
  rows,
  baselineNames = {},
  stats,
  targetName,
  onTargetChange,
  highlightedVariation = null,
}: {
  rows: ConjugateDataPair[];
  baselineNames?: Partial<Record<string, string>>;
  stats: RepCalcStats;
  targetName: string | null;
  onTargetChange: (name: string) => void;
  highlightedVariation?: string | null;
}) {
  const [legendOpen, setLegendOpen] = useState(false);

  const unit = rows[0]?.[1].unit ?? "lbs";

  const { addlWtOffset, variantFactor } = stats;

  // label → date → best e1RM (and corresponding sets/reps/weight) — recomputed only when rows changes
  const { variations, e1rmByLabelAndDate, bestSetByLabelAndDate, allDates } = useMemo(() => {
    const e1rmByLabelAndDate = new Map<string, Map<string, number>>();
    const bestSetByLabelAndDate = new Map<
      string,
      Map<string, { sets: number; reps: number; weight: number }>
    >();

    for (const [exercise, session] of rows) {
      const label = exercise.displayName;
      const date = session.date.toISOString().slice(0, 10);
      if (!e1rmByLabelAndDate.has(label)) {
        e1rmByLabelAndDate.set(label, new Map());
        bestSetByLabelAndDate.set(label, new Map());
      }
      const byDate = e1rmByLabelAndDate.get(label)!;
      const prev = byDate.get(date);
      if (prev === undefined || session.e1rm > prev) {
        byDate.set(date, session.e1rm);
        bestSetByLabelAndDate.get(label)!.set(date, {
          sets: session.sets,
          reps: session.reps,
          weight: session.weight,
        });
      }
    }

    const variations = [...e1rmByLabelAndDate.keys()].sort();

    const allDates = [
      ...new Set([...e1rmByLabelAndDate.values()].flatMap((m) => [...m.keys()])),
    ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return { variations, e1rmByLabelAndDate, bestSetByLabelAndDate, allDates };
  }, [rows]);

  const exerciseType = rows[0]?.[0].type;
  const baselineName = exerciseType ? (baselineNames[exerciseType] ?? null) : null;

  const exerciseByName = useMemo<Map<string, ConjugateExercise>>(() => {
    const m = new Map<string, ConjugateExercise>();
    for (const [ex] of rows) if (!m.has(ex.displayName)) m.set(ex.displayName, ex);
    return m;
  }, [rows]);

  const baselineExercise = baselineName ? (exerciseByName.get(baselineName) ?? null) : null;

  // Fall back to baseline when targetName isn't present in the current rows
  const effectiveTargetName =
    targetName !== null && variations.includes(targetName) ? targetName : baselineName;
  const targetExercise = effectiveTargetName
    ? (exerciseByName.get(effectiveTargetName) ?? null)
    : null;

  // Best normalized e1RM per date across all sessions (not filtered by shown)
  const normalizedByDate = useMemo<Map<string, number>>(() => {
    if (!targetExercise) return new Map();
    const stats = { addlWtOffset, variantFactor };
    const result = new Map<string, number>();
    for (const [exercise, session] of rows) {
      const date = session.date.toISOString().slice(0, 10);
      const normalized = normalizeToBaseE1RM(
        session.weight,
        session.reps,
        exercise,
        targetExercise,
        stats,
        baselineExercise ?? undefined
      );
      if (normalized !== null) {
        const prev = result.get(date);
        if (prev === undefined || normalized > prev) result.set(date, Math.round(normalized));
      }
    }
    return result;
  }, [rows, targetExercise, baselineExercise, addlWtOffset, variantFactor]);

  const data = useMemo(() => {
    return allDates.map((date) => {
      const point: Record<string, string | number> = { date, label: formatDate(date) };
      for (const variation of variations) {
        const e1rm = e1rmByLabelAndDate.get(variation)?.get(date);
        if (e1rm !== undefined) point[variation] = Math.round(e1rm);
      }
      const normalized = normalizedByDate.get(date);
      if (normalized !== undefined) point[NORMALIZED_KEY] = normalized;
      return point;
    });
  }, [allDates, variations, e1rmByLabelAndDate, normalizedByDate]);

  const visibleVariations = useMemo(
    () => variations.map((label, i) => ({ label, i })),
    [variations]
  );

  const showNormalized = normalizedByDate.size > 0;

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
          {showNormalized && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
              <svg width={16} height={8} style={{ flexShrink: 0 }}>
                <line
                  x1={0}
                  y1={4}
                  x2={16}
                  y2={4}
                  stroke={NORMALIZED_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
              </svg>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {NORMALIZED_LABEL}
              </span>
            </div>
          )}
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
              dataKey="label"
              angle={-45}
              textAnchor="end"
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} width={45} unit={` ${unit}`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const isoDate = (payload[0].payload as { date: string }).date;
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
                        name !== NORMALIZED_KEY
                          ? bestSetByLabelAndDate.get(name)?.get(isoDate)
                          : undefined;
                      return (
                        <div key={name} style={{ marginTop: "0.2rem" }}>
                          <div style={{ color: item.color }}>{name}</div>
                          <div>
                            e1RM: {item.value} {unit}
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
              }}
            />
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
            {visibleVariations.map(({ label, i }) => {
              const isHighlighted = highlightedVariation === label;
              const stroke = isHighlighted ? "var(--text-h)" : LINE_COLORS[i % LINE_COLORS.length];
              return (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={stroke}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  dot={{ r: isHighlighted ? 4 : 3 }}
                  activeDot={{ r: 5 }}
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

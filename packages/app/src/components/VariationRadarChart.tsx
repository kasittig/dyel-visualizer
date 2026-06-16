import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import type { SessionStats } from "../hooks/useLastSessionStats";

const MIN_VARIATIONS = 3;

export function VariationRadarChart({
  rows,
  stats,
}: {
  rows: ConjugateDataPair[];
  stats: SessionStats;
}) {
  const unit = rows[0]?.[1].unit ?? "lbs";

  const data = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const [ex] of rows) {
      if (!seen.has(ex.displayName)) {
        seen.add(ex.displayName);
        names.push(ex.displayName);
      }
    }
    return names
      .map((name) => ({ variation: name, e1rm: stats.lastSessionE1RM.get(name) }))
      .filter((d): d is { variation: string; e1rm: number } => d.e1rm !== undefined);
  }, [rows, stats.lastSessionE1RM]);

  if (data.length < MIN_VARIATIONS) return null;

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
        Last session e1RM by variation
      </p>
      <div style={{ width: "80%", margin: "0 auto" }}>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="variation" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} unit={` ${unit}`} />
            <Radar dataKey="e1rm" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Tooltip formatter={(v) => [`${v} ${unit}`, "e1RM"]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

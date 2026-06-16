import { useMemo } from "react";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import type { SessionStats } from "../hooks/useLastSessionStats";
import { BaseRadarChart } from "./BaseRadarChart";

const MIN_VARIATIONS = 3;

export function VariationRadarChart({
  rows,
  stats,
  onVariationClick,
}: {
  rows: ConjugateDataPair[];
  stats: SessionStats;
  onVariationClick?: (variation: string) => void;
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
      .map((name) => ({ variation: name, e1rm: stats.projectedE1RM.get(name) }))
      .filter((d): d is { variation: string; e1rm: number } => d.e1rm !== undefined);
  }, [rows, stats.projectedE1RM]);

  if (data.length < MIN_VARIATIONS) return null;

  return (
    <BaseRadarChart
      label="Projected e1RM by variation (today)"
      data={data}
      angleKey="variation"
      unit={unit}
      onClick={onVariationClick}
      tooltip={{
        content: ({ payload }) => {
          const item = payload?.[0];
          if (!item) return null;
          const name = (item.payload as { variation: string }).variation;
          const lastDate = stats.lastPerformed.get(name);
          const lastE1RM = stats.lastSessionE1RM.get(name);
          const bestSet = stats.lastSessionBestSet.get(name);
          const dateStr = lastDate
            ? lastDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Never";
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
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div>
                Projected e1RM: {Number(item.value).toFixed(2)} {unit}
              </div>
              <div style={{ opacity: 0.7 }}>
                Last session:{" "}
                {lastE1RM !== undefined ? `${lastE1RM.toFixed(2)} ${unit} · ` : ""}
                {dateStr}
                {bestSet
                  ? ` · ${bestSet.sets}×${bestSet.reps} @ ${bestSet.weight} ${unit}`
                  : ""}
              </div>
            </div>
          );
        },
      }}
    />
  );
}

import { useState } from "react";
import type { FilterState } from "../utils/exerciseFilters";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

const FACET_LABELS: Record<keyof FilterState, string> = {
  bar: "Bar",
  stance: "Stance",
  addlWts: "Additional Weight",
  equipment: "Equipment",
};

export function ExerciseFilters({
  rows,
  filters,
  onToggle,
}: {
  rows: ConjugateDataPair[];
  filters: FilterState;
  onToggle: (facet: keyof FilterState, value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const available: Record<keyof FilterState, Set<string>> = {
    bar: new Set(),
    stance: new Set(),
    addlWts: new Set(),
    equipment: new Set(),
  };

  for (const [ex] of rows) {
    if (ex.bar) available.bar.add(ex.bar);
    if (ex.stance) available.stance.add(ex.stance);
    for (const w of ex.addlWts) available.addlWts.add(w);
    if (ex.equipment) available.equipment.add(ex.equipment);
  }

  const activeFacets = (Object.keys(available) as (keyof FilterState)[]).filter(
    (k) => available[k].size > 0
  );

  if (activeFacets.length === 0) return null;

  const activeCount = (Object.keys(filters) as (keyof FilterState)[]).reduce(
    (n, k) => n + filters[k].size,
    0
  );

  return (
    <div style={{ marginBottom: "1rem" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: "0.8rem",
          color: "var(--text)",
          marginBottom: open ? "0.75rem" : 0,
        }}
      >
        {open ? "▲" : "▼"} Filters{activeCount > 0 ? ` (${activeCount} active)` : ""}
      </button>
      {open &&
        activeFacets.map((facet) => (
          <div key={facet} style={{ marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text)", marginRight: "0.5rem" }}>
              {FACET_LABELS[facet]}:
            </span>
            {[...available[facet]].sort().map((value) => {
              const active = filters[facet].has(value);
              return (
                <button
                  key={value}
                  onClick={() => onToggle(facet, value)}
                  style={{
                    marginRight: "0.35rem",
                    marginBottom: "0.25rem",
                    padding: "0.2rem 0.6rem",
                    fontSize: "0.75rem",
                    border: "1px solid",
                    borderRadius: "999px",
                    cursor: "pointer",
                    background: active ? "var(--accent)" : "transparent",
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    color: active ? "var(--bg)" : "var(--text-h)",
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        ))}
    </div>
  );
}

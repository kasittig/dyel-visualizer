import { memo, useMemo, useState } from "react";
import type { FilterState } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

type SetFacet = Exclude<keyof FilterState, "excludeVolumeWork">;

const FACET_LABELS: Record<SetFacet, string> = {
  bar: "Bar",
  stance: "Stance",
  addlWts: "Additional Weight",
  equipment: "Equipment",
};

const FilterButton = memo(function FilterButton({
  value,
  active,
  onClick,
}: {
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
});

export function ExerciseFilters({
  rows,
  filters,
  onToggle,
  excludeVolumeWork,
  onToggleVolumeWork,
}: {
  rows: ConjugateDataPair[];
  filters: FilterState;
  onToggle: (facet: SetFacet, value: string) => void;
  excludeVolumeWork?: boolean;
  onToggleVolumeWork?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const available = useMemo<Record<SetFacet, Set<string>>>(() => {
    const result: Record<SetFacet, Set<string>> = {
      bar: new Set(),
      stance: new Set(),
      addlWts: new Set(),
      equipment: new Set(),
    };
    for (const [ex] of rows) {
      if (ex.bar) result.bar.add(ex.bar);
      if (ex.stance) result.stance.add(ex.stance);
      for (const w of ex.addlWts) result.addlWts.add(w);
      if (ex.equipment) result.equipment.add(ex.equipment);
    }
    return result;
  }, [rows]);

  const activeFacets = useMemo(
    () => (Object.keys(available) as SetFacet[]).filter((k) => available[k].size > 0),
    [available]
  );

  const showVolumeToggle = excludeVolumeWork !== undefined && onToggleVolumeWork !== undefined;

  if (activeFacets.length === 0 && !showVolumeToggle) return null;

  const activeCount =
    (Object.keys(FACET_LABELS) as SetFacet[]).reduce((n, k) => n + filters[k].size, 0) +
    (excludeVolumeWork ? 1 : 0);

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
      {open && (
        <>
          {showVolumeToggle && (
            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={excludeVolumeWork}
                  onChange={onToggleVolumeWork}
                  style={{ marginRight: "0.4rem" }}
                />
                Exclude volume work (sets &gt; 1)
              </label>
            </div>
          )}
          {activeFacets.map((facet) => (
            <div key={facet} style={{ marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text)", marginRight: "0.5rem" }}>
                {FACET_LABELS[facet]}:
              </span>
              {[...available[facet]].sort().map((value) => (
                <FilterButton
                  key={value}
                  value={value}
                  active={filters[facet].has(value)}
                  onClick={() => onToggle(facet, value)}
                />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

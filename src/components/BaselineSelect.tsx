import type { ConjugateDataPair } from "../hooks/useConjugateData";

export function BaselineSelect({
  rows,
  selectedName,
  onSelect,
}: {
  rows: ConjugateDataPair[];
  selectedName: string | null;
  onSelect: (displayName: string) => void;
}) {
  const seen = new Set<string>();
  const exercises: string[] = [];
  for (const [ex] of rows) {
    if (!seen.has(ex.displayName)) {
      seen.add(ex.displayName);
      exercises.push(ex.displayName);
    }
  }
  exercises.sort((a, b) => a.localeCompare(b));

  if (exercises.length <= 1 || selectedName === null) return null;

  return (
    <div style={{ marginBottom: "0.75rem", fontSize: "0.75rem" }}>
      <label htmlFor="baseline-select" style={{ marginRight: "0.5rem", color: "var(--text)" }}>
        Baseline:
      </label>
      <select
        id="baseline-select"
        value={selectedName}
        onChange={(e) => onSelect(e.target.value)}
        style={{ fontSize: "0.75rem", width: "auto" }}
      >
        {exercises.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

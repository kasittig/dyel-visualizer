import type { ConjugateDataPair } from "../hooks/useConjugateData";

const DEFAULT_BAR = "standard";
const DEFAULT_STANCE = "competition";

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
  const exercises: { displayName: string; isDefault: boolean }[] = [];
  for (const [ex] of rows) {
    if (!seen.has(ex.displayName)) {
      seen.add(ex.displayName);
      exercises.push({
        displayName: ex.displayName,
        isDefault:
          ex.bar === DEFAULT_BAR &&
          ex.stance === DEFAULT_STANCE &&
          ex.equipment === null &&
          ex.addlWts.length === 0,
      });
    }
  }

  if (exercises.length <= 1) return null;

  const defaultExercise = exercises.find((e) => e.isDefault) ?? exercises[0];
  const effective =
    selectedName && exercises.some((e) => e.displayName === selectedName)
      ? selectedName
      : defaultExercise.displayName;

  return (
    <div style={{ marginBottom: "0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
      <label htmlFor="baseline-select" style={{ marginRight: "0.5rem" }}>
        Baseline:
      </label>
      <select
        id="baseline-select"
        value={effective}
        onChange={(e) => onSelect(e.target.value)}
        style={{ fontSize: "0.75rem", color: "#374151" }}
      >
        {exercises.map((ex) => (
          <option key={ex.displayName} value={ex.displayName}>
            {ex.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

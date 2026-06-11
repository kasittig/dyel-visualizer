export function setsRepsLabel(
  bestSet: { weight: number; reps: number } | undefined,
  allSets: { weight: number; reps: number }[],
  unit: "lbs" | "kg" = "lbs"
): string | null {
  if (!bestSet) return null;
  const setCount = allSets.filter(
    (s) => s.weight === bestSet.weight && s.reps === bestSet.reps
  ).length;
  return `${setCount}×${bestSet.reps} @ ${bestSet.weight} ${unit}`;
}

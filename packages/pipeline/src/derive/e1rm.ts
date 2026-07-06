// An attached RPE shifts effective reps toward failure (e.g. a 3-rep set at RPE9 behaves
// like a 4-rep max: reps + (10 - rpe)) — mirrors @dyel/core's calcE1RM exactly.
export const calcE1RM = (w: number, r: number, rpe?: number | null) => {
  const effectiveReps = rpe != null ? r + (10 - rpe) : r;
  return effectiveReps <= 1 ? w : w * (1 + effectiveReps / 30);
};

export const invertE1RM = (e1rm: number, r: number) => (r === 1 ? e1rm : e1rm / (1 + r / 30));

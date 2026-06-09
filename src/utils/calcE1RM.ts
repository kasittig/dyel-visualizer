export function calcE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  // Epley formula
  return weight * (1 + reps / 30);
}

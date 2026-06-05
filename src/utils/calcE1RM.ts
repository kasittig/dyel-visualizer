export function calcE1RM(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + 0.0333 * reps);
}

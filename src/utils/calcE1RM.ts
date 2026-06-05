export function calcE1RM(weight: number, reps: number): number {
  // Epley formula
  return weight * (1 + (reps / 30));
}

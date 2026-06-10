import type { SheetRow } from "../hooks/useSheetData";
import type { ConjugateExercise } from "../types/conjugate";
import { nameToExercise } from "./parseConjugateData";

export type ParsedConjugateRow = {
  row: SheetRow;
  exercise: ConjugateExercise | null;
  label: string | null;
};

export function parseConjugateRows(rows: SheetRow[]): ParsedConjugateRow[] {
  return rows.map((row) => {
    const exercise = nameToExercise(row["exercise"]?.trim() ?? "");
    return { row, exercise, label: exercise?.displayName ?? null };
  });
}

import type { ParsedConjugateRow } from "./parseConjugate";
import type { ConjugateLift } from "../types/conjugate";
import { findCol } from "../hooks/useSheetData";
import { fitAccommodatingOffset, type FitResult } from "./fitAccommodatingOffset";
import { calcNormalizedE1RM, type AccommodatingOffsets } from "./calcNormalizedE1RM";

const TRAILING_WEEKS = 12;

export type TargetWeightResult = {
  targetWeight: number;
  workingE1RM: number;
  offsets: AccommodatingOffsets;
  fitMeta: { chains: FitResult; bands: FitResult; reverseBands: FitResult };
  sessionCount: number;
};

function roundTo2_5(value: number): number {
  return Math.round(value / 2.5) * 2.5;
}

export function calcTargetWeight(
  rows: ParsedConjugateRow[],
  liftType: ConjugateLift["liftType"],
  targetReps: number,
  now: Date = new Date()
): TargetWeightResult | null {
  const chainsFit = fitAccommodatingOffset(rows, liftType, "chains");
  const bandsFit = fitAccommodatingOffset(rows, liftType, "bands");
  const reverseBandsFit = fitAccommodatingOffset(rows, liftType, "reverseBands");
  const offsets: AccommodatingOffsets = {
    chains: chainsFit.offset,
    bands: bandsFit.offset,
    reverseBands: reverseBandsFit.offset,
  };

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - TRAILING_WEEKS * 7);

  let bestE1RM = 0;
  const sessionDates = new Set<string>();

  for (const row of rows) {
    if (!row.lift || row.lift.liftType !== liftType) continue;
    const dateStr = row.row["date"]?.trim() ?? "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime()) || date < cutoff) continue;

    const barWeight = parseFloat(findCol(row.row, "weight") ?? "");
    const reps = parseFloat(row.row["reps"] ?? "");
    if (isNaN(barWeight) || isNaN(reps) || reps <= 0) continue;

    sessionDates.add(dateStr);
    const e1rm = calcNormalizedE1RM(barWeight, reps, row.lift, offsets);
    if (e1rm > bestE1RM) bestE1RM = e1rm;
  }

  if (bestE1RM === 0) return null;

  // For 1 rep, the working e1RM is the target weight directly (Epley's formula treats 1RM as the weight itself)
  const targetWeight =
    targetReps === 1 ? roundTo2_5(bestE1RM) : roundTo2_5(bestE1RM / (1 + targetReps / 30));

  return {
    targetWeight,
    workingE1RM: Math.round(bestE1RM),
    offsets,
    fitMeta: { chains: chainsFit, bands: bandsFit, reverseBands: reverseBandsFit },
    sessionCount: sessionDates.size,
  };
}

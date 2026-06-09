import type { ParsedConjugateRow } from "./parseConjugate";
import { findCol } from "../hooks/useSheetData";
import { calcE1RM } from "./calcE1RM";
import type { ConjugateLift } from "../types/conjugate";

export type AccommodatingType = "chains" | "bands" | "reverseBands";

export type FitResult = {
  offset: number;
  method: "paired_blocks" | "global_mean" | "default";
  pairedBlockCount: number;
  modifiedSetCount: number;
};

const DEFAULT_OFFSET_LBS = 50;
const BLOCK_DAYS = 21;
const MIN_PAIRED_BLOCKS = 3;

type ParsedSet = { date: Date; barWeight: number; reps: number };

function parseSet(row: ParsedConjugateRow): ParsedSet | null {
  const date = new Date(row.row["date"]?.trim() ?? "");
  if (isNaN(date.getTime())) return null;
  const barWeight = parseFloat(findCol(row.row, "weight") ?? "");
  const reps = parseFloat(row.row["reps"] ?? "");
  if (isNaN(barWeight) || isNaN(reps) || reps <= 0) return null;
  return { date, barWeight, reps };
}

function hasModifier(lift: ConjugateLift, type: AccommodatingType): boolean {
  if (type === "chains") return lift.variation.hasChains;
  if (type === "bands") return lift.variation.hasBands;
  return lift.liftType === "deadlift" && lift.variation.hasReverseBands;
}

function isAnyAccommodated(lift: ConjugateLift): boolean {
  return (
    lift.variation.hasChains ||
    lift.variation.hasBands ||
    (lift.liftType === "deadlift" && lift.variation.hasReverseBands)
  );
}

export function fitAccommodatingOffset(
  rows: ParsedConjugateRow[],
  liftType: ConjugateLift["liftType"],
  modifierType: AccommodatingType
): FitResult {
  const modifiedSets: ParsedSet[] = [];
  const straightSets: ParsedSet[] = [];

  for (const row of rows) {
    if (!row.lift || row.lift.liftType !== liftType) continue;
    const parsed = parseSet(row);
    if (!parsed) continue;
    if (hasModifier(row.lift, modifierType)) {
      modifiedSets.push(parsed);
    } else if (!isAnyAccommodated(row.lift)) {
      straightSets.push(parsed);
    }
  }

  if (modifiedSets.length === 0) {
    return {
      offset: DEFAULT_OFFSET_LBS,
      method: "default",
      pairedBlockCount: 0,
      modifiedSetCount: 0,
    };
  }

  const minTime = Math.min(...[...modifiedSets, ...straightSets].map((s) => s.date.getTime()));
  const windowMs = BLOCK_DAYS * 24 * 60 * 60 * 1000;
  const windowOf = (d: Date) => Math.floor((d.getTime() - minTime) / windowMs);

  const modByWindow = new Map<number, ParsedSet[]>();
  const strByWindow = new Map<number, ParsedSet[]>();
  for (const s of modifiedSets) {
    const w = windowOf(s.date);
    modByWindow.set(w, [...(modByWindow.get(w) ?? []), s]);
  }
  for (const s of straightSets) {
    const w = windowOf(s.date);
    strByWindow.set(w, [...(strByWindow.get(w) ?? []), s]);
  }

  const pairedWindows = [...modByWindow.keys()].filter((w) => strByWindow.has(w));

  if (pairedWindows.length >= MIN_PAIRED_BLOCKS) {
    const offsets: number[] = [];
    for (const w of pairedWindows) {
      const bestStraightE1RM = Math.max(
        ...strByWindow.get(w)!.map((s) => calcE1RM(s.barWeight, s.reps))
      );
      for (const ms of modByWindow.get(w)!) {
        const apparentWeight = bestStraightE1RM / (1 + ms.reps / 30);
        // chains/bands add load at lockout; reverse bands reduce effective load
        const delta =
          modifierType === "reverseBands"
            ? ms.barWeight - apparentWeight
            : apparentWeight - ms.barWeight;
        offsets.push(delta);
      }
    }
    const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
    return {
      offset: Math.max(0, mean),
      method: "paired_blocks",
      pairedBlockCount: pairedWindows.length,
      modifiedSetCount: modifiedSets.length,
    };
  }

  if (straightSets.length > 0) {
    const meanStr =
      straightSets.reduce((sum, s) => sum + calcE1RM(s.barWeight, s.reps), 0) / straightSets.length;
    const meanMod =
      modifiedSets.reduce((sum, s) => sum + calcE1RM(s.barWeight, s.reps), 0) / modifiedSets.length;
    const offset = modifierType === "reverseBands" ? meanMod - meanStr : meanStr - meanMod;
    return {
      offset: Math.max(0, offset),
      method: "global_mean",
      pairedBlockCount: 0,
      modifiedSetCount: modifiedSets.length,
    };
  }

  // Chain/band sets exist but no straight sets to calibrate from
  return {
    offset: DEFAULT_OFFSET_LBS,
    method: "default",
    pairedBlockCount: 0,
    modifiedSetCount: modifiedSets.length,
  };
}

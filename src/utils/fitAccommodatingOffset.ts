import type { ParsedConjugateRow } from "./parseConjugate";
import { findCol } from "../hooks/useSheetData";
import { calcE1RM } from "./calcE1RM";
import type { ConjugateLift } from "../types/conjugate";

export type AccommodatingType = "chains" | "bands" | "reverseBands";

export type FitResult = {
  // Effective weight contribution in lbs (always set; used as fallback when chainWeight is unknown per set)
  offset: number;
  // Fitted effectiveness coefficient: effective_weight = alpha × nominalModifierWeight.
  // Null when no sessions have a nominal modifier weight label.
  alpha: number | null;
  // Mean nominal modifier weight from labeled sessions (e.g. 80 for "80 lbs chains").
  // Null when no sessions carry a weight label. Used for display only.
  nominalModifierWeight: number | null;
  method: "paired_blocks" | "global_mean" | "default";
  pairedBlockCount: number;
  modifiedSetCount: number;
};

const DEFAULT_OFFSET_LBS = 50;
const BLOCK_DAYS = 21;
const MIN_PAIRED_BLOCKS = 3;

type ParsedSet = {
  date: Date;
  barWeight: number;
  reps: number;
  baseKey: string;
  modifierWeight: number | null;
};

function parseSet(row: ParsedConjugateRow): Omit<ParsedSet, "baseKey" | "modifierWeight"> | null {
  const date = new Date(row.row["date"]?.trim() ?? "");
  if (isNaN(date.getTime())) return null;
  const barWeight = parseFloat(findCol(row.row, "weight") ?? "");
  const reps = parseFloat(row.row["reps"] ?? "");
  if (isNaN(barWeight) || isNaN(reps) || reps <= 0) return null;
  return { date, barWeight, reps };
}

function getModifierWeight(lift: ConjugateLift, type: AccommodatingType): number | null {
  if (type === "chains") return lift.variation.chainWeight;
  if (type === "bands") return lift.variation.bandWeight;
  return null;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function hasModifier(lift: ConjugateLift, type: AccommodatingType): boolean {
  if (type === "chains") return lift.variation.hasChains;
  if (type === "bands") return lift.variation.hasBands;
  return lift.liftType === "deadlift" && lift.variation.hasReverseBands;
}

// Returns a string key representing every variation field except the modifier being fitted.
// Two lifts with the same key differ only in whether they have that modifier, so their
// e1RMs can be directly compared to estimate the modifier's effective weight contribution.
function baseVariationKey(lift: ConjugateLift, modifierType: AccommodatingType): string {
  switch (lift.liftType) {
    case "squat": {
      const v = lift.variation;
      return [
        "squat",
        v.bar,
        String(v.hasBox),
        String(modifierType !== "chains" && v.hasChains),
        String(modifierType !== "bands" && v.hasBands),
      ].join(":");
    }
    case "bench": {
      const v = lift.variation;
      return [
        "bench",
        v.bar,
        v.angle,
        v.grip,
        String(v.boardCount),
        String(v.hasSlingshot),
        String(v.hasPause),
        String(modifierType !== "chains" && v.hasChains),
        String(modifierType !== "bands" && v.hasBands),
      ].join(":");
    }
    case "deadlift": {
      const v = lift.variation;
      return [
        "deadlift",
        String(v.isReverseStance),
        String(v.blockHeight),
        String(v.deficitHeight),
        String(modifierType !== "chains" && v.hasChains),
        String(modifierType !== "bands" && v.hasBands),
        String(modifierType !== "reverseBands" && v.hasReverseBands),
      ].join(":");
    }
  }
}

export function fitAccommodatingOffset(
  rows: ParsedConjugateRow[],
  liftType: ConjugateLift["liftType"],
  modifierType: AccommodatingType
): FitResult {
  const modifiedSets: ParsedSet[] = [];
  const comparableSets: ParsedSet[] = [];

  for (const row of rows) {
    if (!row.lift || row.lift.liftType !== liftType) continue;
    const parsed = parseSet(row);
    if (!parsed) continue;
    const baseKey = baseVariationKey(row.lift, modifierType);
    if (hasModifier(row.lift, modifierType)) {
      modifiedSets.push({
        ...parsed,
        baseKey,
        modifierWeight: getModifierWeight(row.lift, modifierType),
      });
    } else {
      comparableSets.push({ ...parsed, baseKey, modifierWeight: null });
    }
  }

  if (modifiedSets.length === 0) {
    return {
      offset: DEFAULT_OFFSET_LBS,
      alpha: null,
      nominalModifierWeight: null,
      method: "default",
      pairedBlockCount: 0,
      modifiedSetCount: 0,
    };
  }

  // Pre-compute inferred modifier weight per base variation: mean of labeled sessions in that group.
  // Unlabeled sessions (modifierWeight === null) inherit this inferred weight when computing alpha.
  const modByBase = new Map<string, ParsedSet[]>();
  for (const s of modifiedSets) modByBase.set(s.baseKey, [...(modByBase.get(s.baseKey) ?? []), s]);

  const inferredWeightByBase = new Map<string, number | null>();
  for (const [baseKey, sets] of modByBase) {
    const known = sets.map((s) => s.modifierWeight).filter((w): w is number => w !== null);
    inferredWeightByBase.set(baseKey, known.length > 0 ? mean(known) : null);
  }

  const allInferred = [...inferredWeightByBase.values()].filter((w): w is number => w !== null);
  const nominalModifierWeight = allInferred.length > 0 ? mean(allInferred) : null;

  // Group by "(windowIndex):(baseKey)" so only same-variation sets within the same block are paired.
  const allTimes = [...modifiedSets, ...comparableSets].map((s) => s.date.getTime());
  const minTime = Math.min(...allTimes);
  const windowMs = BLOCK_DAYS * 24 * 60 * 60 * 1000;
  const windowKeyOf = (s: ParsedSet) =>
    `${Math.floor((s.date.getTime() - minTime) / windowMs)}:${s.baseKey}`;

  const modByGroup = new Map<string, ParsedSet[]>();
  const cmpByGroup = new Map<string, ParsedSet[]>();
  for (const s of modifiedSets) {
    const k = windowKeyOf(s);
    modByGroup.set(k, [...(modByGroup.get(k) ?? []), s]);
  }
  for (const s of comparableSets) {
    const k = windowKeyOf(s);
    cmpByGroup.set(k, [...(cmpByGroup.get(k) ?? []), s]);
  }

  const pairedGroups = [...modByGroup.keys()].filter((k) => cmpByGroup.has(k));

  if (pairedGroups.length >= MIN_PAIRED_BLOCKS) {
    const rawOffsets: number[] = [];
    const alphas: number[] = [];
    for (const k of pairedGroups) {
      const baseKey = k.slice(k.indexOf(":") + 1);
      const inferredWeight = inferredWeightByBase.get(baseKey) ?? null;
      const bestCmpE1RM = Math.max(...cmpByGroup.get(k)!.map((s) => calcE1RM(s.barWeight, s.reps)));
      for (const ms of modByGroup.get(k)!) {
        const apparentWeight = bestCmpE1RM / (1 + ms.reps / 30);
        // chains/bands add load at lockout; reverse bands reduce effective load
        const delta =
          modifierType === "reverseBands"
            ? ms.barWeight - apparentWeight
            : apparentWeight - ms.barWeight;
        rawOffsets.push(delta);
        const effectiveWeight = ms.modifierWeight ?? inferredWeight;
        if (effectiveWeight !== null && effectiveWeight > 0) {
          alphas.push(delta / effectiveWeight);
        }
      }
    }
    const alpha = alphas.length > 0 ? mean(alphas) : null;
    const offset =
      alpha !== null && nominalModifierWeight !== null
        ? alpha * nominalModifierWeight
        : mean(rawOffsets);
    return {
      offset: Math.max(0, offset),
      alpha,
      nominalModifierWeight,
      method: "paired_blocks",
      pairedBlockCount: pairedGroups.length,
      modifiedSetCount: modifiedSets.length,
    };
  }

  // Global mean fallback: group by baseKey across all time, require same base variation.
  const cmpByBase = new Map<string, ParsedSet[]>();
  for (const s of comparableSets)
    cmpByBase.set(s.baseKey, [...(cmpByBase.get(s.baseKey) ?? []), s]);

  const baseKeysWithBoth = [...modByBase.keys()].filter((k) => cmpByBase.has(k));

  if (baseKeysWithBoth.length > 0) {
    const offsetsPerBase = baseKeysWithBoth.map((k) => {
      const meanCmp =
        cmpByBase.get(k)!.reduce((sum, s) => sum + calcE1RM(s.barWeight, s.reps), 0) /
        cmpByBase.get(k)!.length;
      const meanMod =
        modByBase.get(k)!.reduce((sum, s) => sum + calcE1RM(s.barWeight, s.reps), 0) /
        modByBase.get(k)!.length;
      return modifierType === "reverseBands" ? meanMod - meanCmp : meanCmp - meanMod;
    });
    const meanOffset = mean(offsetsPerBase);
    const alphasPerBase = baseKeysWithBoth
      .map((k, i) => {
        const w = inferredWeightByBase.get(k) ?? null;
        return w !== null && w > 0 ? offsetsPerBase[i] / w : null;
      })
      .filter((a): a is number => a !== null);
    const alpha = alphasPerBase.length > 0 ? mean(alphasPerBase) : null;
    const offset =
      alpha !== null && nominalModifierWeight !== null ? alpha * nominalModifierWeight : meanOffset;
    return {
      offset: Math.max(0, offset),
      alpha,
      nominalModifierWeight,
      method: "global_mean",
      pairedBlockCount: 0,
      modifiedSetCount: modifiedSets.length,
    };
  }

  // Modified sets exist but no comparable variation to calibrate from
  return {
    offset: DEFAULT_OFFSET_LBS,
    alpha: null,
    nominalModifierWeight,
    method: "default",
    pairedBlockCount: 0,
    modifiedSetCount: modifiedSets.length,
  };
}

import type { BenchAngle, BenchBar, ConjugateLift, SquatBar } from "../types/conjugate";
import type { BenchFilter, DeadliftFilter, SquatFilter } from "../types/conjugateFilters";
import type { ParsedConjugateRow } from "./parseConjugate";

export type SquatPresence = {
  bars: Set<SquatBar>;
  hasBox: boolean;
  hasChains: boolean;
  hasBands: boolean;
};

export type BenchPresence = {
  bars: Set<BenchBar>;
  angles: Set<BenchAngle>;
  hasChains: boolean;
  hasBands: boolean;
  hasSlingshot: boolean;
  hasPause: boolean;
};

export type DeadliftPresence = {
  hasReverseStance: boolean;
  hasChains: boolean;
  hasBands: boolean;
  hasReverseBands: boolean;
};

export type ConjugatePresence = {
  squat: SquatPresence;
  bench: BenchPresence;
  deadlift: DeadliftPresence;
};

export function getConjugatePresence(rows: ParsedConjugateRow[]): ConjugatePresence {
  const squat: SquatPresence = {
    bars: new Set(),
    hasBox: false,
    hasChains: false,
    hasBands: false,
  };
  const bench: BenchPresence = {
    bars: new Set(),
    angles: new Set(),
    hasChains: false,
    hasBands: false,
    hasSlingshot: false,
    hasPause: false,
  };
  const deadlift: DeadliftPresence = {
    hasReverseStance: false,
    hasChains: false,
    hasBands: false,
    hasReverseBands: false,
  };

  for (const { lift } of rows) {
    if (!lift) continue;
    if (lift.liftType === "squat") {
      const v = lift.variation;
      squat.bars.add(v.bar);
      if (v.hasBox) squat.hasBox = true;
      if (v.hasChains) squat.hasChains = true;
      if (v.hasBands) squat.hasBands = true;
    } else if (lift.liftType === "bench") {
      const v = lift.variation;
      bench.bars.add(v.bar);
      bench.angles.add(v.angle);
      if (v.hasChains) bench.hasChains = true;
      if (v.hasBands) bench.hasBands = true;
      if (v.hasSlingshot) bench.hasSlingshot = true;
      if (v.hasPause) bench.hasPause = true;
    } else {
      const v = lift.variation;
      if (v.isReverseStance) deadlift.hasReverseStance = true;
      if (v.hasChains) deadlift.hasChains = true;
      if (v.hasBands) deadlift.hasBands = true;
      if (v.hasReverseBands) deadlift.hasReverseBands = true;
    }
  }

  return { squat, bench, deadlift };
}

type AnyFilter = SquatFilter | BenchFilter | DeadliftFilter;

function isFilteredOut(lift: ConjugateLift, filter: AnyFilter): boolean {
  if (lift.liftType === "squat") {
    const f = filter as SquatFilter;
    const v = lift.variation;
    if (f.bars.size > 0 && !f.bars.has(v.bar)) return true;
    if (f.onlyBox && !v.hasBox) return true;
    if (f.onlyChains && !v.hasChains) return true;
    if (f.onlyBands && !v.hasBands) return true;
    return false;
  }
  if (lift.liftType === "bench") {
    const f = filter as BenchFilter;
    const v = lift.variation;
    if (f.bars.size > 0 && !f.bars.has(v.bar)) return true;
    if (f.angles.size > 0 && !f.angles.has(v.angle)) return true;
    if (f.onlyChains && !v.hasChains) return true;
    if (f.onlyBands && !v.hasBands) return true;
    if (f.onlySlingshot && !v.hasSlingshot) return true;
    if (f.onlyPause && !v.hasPause) return true;
    return false;
  }
  if (lift.liftType === "deadlift") {
    const f = filter as DeadliftFilter;
    const v = lift.variation;
    if (f.onlyReverseStance && !v.isReverseStance) return true;
    if (f.onlyChains && !v.hasChains) return true;
    if (f.onlyBands && !v.hasBands) return true;
    if (f.onlyReverseBands && !v.hasReverseBands) return true;
    return false;
  }
  return false;
}

export function getFilteredOutLabels(
  rows: ParsedConjugateRow[],
  liftType: ConjugateLift["liftType"],
  filter: AnyFilter
): Set<string> {
  const out = new Set<string>();
  for (const { lift, label } of rows) {
    if (!lift || lift.liftType !== liftType || !label) continue;
    if (isFilteredOut(lift, filter)) {
      out.add(label);
    }
  }
  return out;
}

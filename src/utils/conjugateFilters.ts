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

type LiftWithFilter =
  | { liftType: "squat"; lift: Extract<ConjugateLift, { liftType: "squat" }>; filter: SquatFilter }
  | { liftType: "bench"; lift: Extract<ConjugateLift, { liftType: "bench" }>; filter: BenchFilter }
  | {
      liftType: "deadlift";
      lift: Extract<ConjugateLift, { liftType: "deadlift" }>;
      filter: DeadliftFilter;
    };

function isFilteredOut(liftWithFilter: LiftWithFilter): boolean {
  if (liftWithFilter.liftType === "squat") {
    const { lift, filter } = liftWithFilter;
    const v = lift.variation;
    if (filter.bars.size > 0 && !filter.bars.has(v.bar)) return true;
    if (filter.onlyBox && !v.hasBox) return true;
    if (filter.onlyChains && !v.hasChains) return true;
    if (filter.onlyBands && !v.hasBands) return true;
    return false;
  }
  if (liftWithFilter.liftType === "bench") {
    const { lift, filter } = liftWithFilter;
    const v = lift.variation;
    if (filter.bars.size > 0 && !filter.bars.has(v.bar)) return true;
    if (filter.angles.size > 0 && !filter.angles.has(v.angle)) return true;
    if (filter.onlyChains && !v.hasChains) return true;
    if (filter.onlyBands && !v.hasBands) return true;
    if (filter.onlySlingshot && !v.hasSlingshot) return true;
    if (filter.onlyPause && !v.hasPause) return true;
    return false;
  }
  if (liftWithFilter.liftType === "deadlift") {
    const { lift, filter } = liftWithFilter;
    const v = lift.variation;
    if (filter.onlyReverseStance && !v.isReverseStance) return true;
    if (filter.onlyChains && !v.hasChains) return true;
    if (filter.onlyBands && !v.hasBands) return true;
    if (filter.onlyReverseBands && !v.hasReverseBands) return true;
    return false;
  }
  return false;
}

export type FilteredOutQuery =
  | { liftType: "squat"; filter: SquatFilter }
  | { liftType: "bench"; filter: BenchFilter }
  | { liftType: "deadlift"; filter: DeadliftFilter };

export function getFilteredOutLabels(
  rows: ParsedConjugateRow[],
  query: FilteredOutQuery
): Set<string> {
  const out = new Set<string>();
  for (const { lift, label } of rows) {
    if (!lift || lift.liftType !== query.liftType || !label) continue;
    if (
      (query.liftType === "squat" &&
        lift.liftType === "squat" &&
        isFilteredOut({ liftType: "squat", lift, filter: query.filter })) ||
      (query.liftType === "bench" &&
        lift.liftType === "bench" &&
        isFilteredOut({ liftType: "bench", lift, filter: query.filter })) ||
      (query.liftType === "deadlift" &&
        lift.liftType === "deadlift" &&
        isFilteredOut({ liftType: "deadlift", lift, filter: query.filter }))
    ) {
      out.add(label);
    }
  }
  return out;
}

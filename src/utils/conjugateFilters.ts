import type { ConjugateLift } from "../types/conjugate";
import type { BenchFilter, DeadliftFilter, SquatFilter } from "../types/conjugateFilters";
import type { ParsedConjugateRow } from "./parseConjugate";

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

import { calcE1RM } from "./calcE1RM";
import type { ConjugateLift } from "../types/conjugate";

export type AccommodatingOffsets = {
  chains: number;
  bands: number;
  reverseBands: number;
};

export function calcNormalizedE1RM(
  barWeight: number,
  reps: number,
  lift: ConjugateLift,
  offsets: AccommodatingOffsets
): number {
  const reverseBandReduction =
    lift.liftType === "deadlift" && lift.variation.hasReverseBands ? offsets.reverseBands : 0;
  const effectiveWeight =
    barWeight +
    (lift.variation.hasChains ? offsets.chains : 0) +
    (lift.variation.hasBands ? offsets.bands : 0) -
    reverseBandReduction;
  return calcE1RM(Math.max(0, effectiveWeight), reps);
}

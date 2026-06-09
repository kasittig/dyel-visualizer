import { calcE1RM } from "./calcE1RM";
import type { ConjugateLift } from "../types/conjugate";

export type AccommodatingFit = {
  offset: number;
  alpha: number | null;
};

export type AccommodatingFits = {
  chains: AccommodatingFit;
  bands: AccommodatingFit;
  reverseBands: AccommodatingFit;
};

function effectiveContrib(
  hasMod: boolean,
  fit: AccommodatingFit,
  nominalWeight: number | null
): number {
  if (!hasMod) return 0;
  if (fit.alpha !== null && nominalWeight !== null) return fit.alpha * nominalWeight;
  return fit.offset;
}

export function calcNormalizedE1RM(
  barWeight: number,
  reps: number,
  lift: ConjugateLift,
  fits: AccommodatingFits
): number {
  const chainsContrib = effectiveContrib(
    lift.variation.hasChains,
    fits.chains,
    lift.variation.chainWeight
  );
  const bandsContrib = effectiveContrib(
    lift.variation.hasBands,
    fits.bands,
    lift.variation.bandWeight
  );
  const reverseBandReduction =
    lift.liftType === "deadlift" && lift.variation.hasReverseBands ? fits.reverseBands.offset : 0;
  const effectiveWeight = barWeight + chainsContrib + bandsContrib - reverseBandReduction;
  return calcE1RM(Math.max(0, effectiveWeight), reps);
}

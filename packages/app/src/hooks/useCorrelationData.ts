import { useMemo } from "react";
import { computeCorrelationMatrix, selectTopCrossLiftVariants } from "@dyel/core";
import type { ConjugateDataPair } from "./useConjugateData";

function uniqueVariantNames(rows: ConjugateDataPair[], type?: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const [ex] of rows) {
    if (type && ex.type !== type) continue;
    if (!seen.has(ex.displayName)) {
      seen.add(ex.displayName);
      names.push(ex.displayName);
    }
  }
  return names;
}

export function usePerLiftCorrelation(
  rows: ConjugateDataPair[],
  minOverlap = 5
): { matrix: number[][]; variantNames: string[] } {
  return useMemo(() => {
    const variantNames = uniqueVariantNames(rows);
    if (variantNames.length < 2) return { matrix: [], variantNames: [] };
    const matrix = computeCorrelationMatrix(rows, variantNames, minOverlap);
    return { matrix, variantNames };
  }, [rows, minOverlap]);
}

export type LiftTypeKey = "squat" | "bench" | "deadlift";

export function useCrossLiftCorrelation(
  rows: ConjugateDataPair[],
  baselineNames: Partial<Record<LiftTypeKey, string>>,
  topPerLift = 3
): { matrix: number[][]; labels: string[]; liftTypes: Record<string, LiftTypeKey> } {
  return useMemo(() => {
    const sqVariants = uniqueVariantNames(rows, "squat");
    const bpVariants = uniqueVariantNames(rows, "bench");
    const dlVariants = uniqueVariantNames(rows, "deadlift");

    const {
      squat: topSq,
      bench: topBp,
      deadlift: topDl,
    } = selectTopCrossLiftVariants(
      rows,
      sqVariants,
      bpVariants,
      dlVariants,
      baselineNames.squat,
      baselineNames.bench,
      baselineNames.deadlift,
      topPerLift
    );

    const labels = [...topSq, ...topBp, ...topDl];
    if (labels.length < 2) return { matrix: [], labels: [], liftTypes: {} };

    const liftTypes: Record<string, LiftTypeKey> = {};
    for (const n of topSq) liftTypes[n] = "squat";
    for (const n of topBp) liftTypes[n] = "bench";
    for (const n of topDl) liftTypes[n] = "deadlift";

    const matrix = computeCorrelationMatrix(rows, labels);
    return { matrix, labels, liftTypes };
  }, [rows, baselineNames, topPerLift]);
}

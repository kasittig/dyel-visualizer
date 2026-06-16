import type { ConjugateDataPair } from "../hooks/useConjugateData";
import { useCrossLiftCorrelation } from "../hooks/useCorrelationData";
import type { LiftTypeKey } from "../hooks/useCorrelationData";
import { CorrelationMatrix } from "./CorrelationMatrix";

export function CrossLiftCorrelationPanel({
  rows,
  baselineNames,
}: {
  rows: ConjugateDataPair[];
  baselineNames: Partial<Record<LiftTypeKey, string>>;
}) {
  const { matrix, labels, liftTypes } = useCrossLiftCorrelation(rows, baselineNames);

  if (labels.length < 2) return null;

  const competitionLabels = new Set(
    [baselineNames.squat, baselineNames.bench, baselineNames.deadlift].filter(
      (n): n is string => n !== undefined
    )
  );

  return (
    <CorrelationMatrix
      matrix={matrix}
      labels={labels}
      competitionLabels={competitionLabels}
      liftTypes={liftTypes}
      title="Cross-Lift Correlation (top variants)"
    />
  );
}

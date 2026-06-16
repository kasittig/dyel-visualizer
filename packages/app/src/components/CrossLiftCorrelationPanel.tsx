import type { ConjugateDataPair } from "../hooks/useConjugateData";
import { useCrossLiftCorrelation } from "../hooks/useCorrelationData";
import type { LiftTypeKey } from "../hooks/useCorrelationData";
import { CorrelationMatrix } from "./CorrelationMatrix";

export function CrossLiftCorrelationPanel({
  rows,
  targetNames,
}: {
  rows: ConjugateDataPair[];
  targetNames: Partial<Record<LiftTypeKey, string>>;
}) {
  const { matrix, sampleMatrix, labels, liftTypes } = useCrossLiftCorrelation(rows, targetNames);

  if (labels.length < 2) return null;

  const competitionLabels = new Set(
    [targetNames.squat, targetNames.bench, targetNames.deadlift].filter(
      (n): n is string => n !== undefined
    )
  );

  return (
    <CorrelationMatrix
      matrix={matrix}
      sampleMatrix={sampleMatrix}
      labels={labels}
      competitionLabels={competitionLabels}
      liftTypes={liftTypes}
      title="Cross-Lift Correlation (top variants)"
    />
  );
}

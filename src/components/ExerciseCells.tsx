const muted: React.CSSProperties = { color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" };

export function OneRepMaxCell({ one }: { one: { date: Date; weight: number } | undefined }) {
  if (!one) return <>—</>;
  return (
    <>
      <span style={muted}>{one.date.toLocaleDateString()}</span>
      <br />
      {one.weight} lbs
    </>
  );
}

export function PredictedE1RMCell({ predicted }: { predicted: number | null | undefined }) {
  if (predicted == null) return <>—</>;
  return <>{Math.round(predicted)} lbs</>;
}

export function AddlWtOffsetCell({
  addlWtOffset,
}: {
  addlWtOffset: { offset: number; sampleCount: number } | undefined;
}) {
  if (addlWtOffset === undefined) return <>—</>;
  const { offset, sampleCount } = addlWtOffset;
  if (sampleCount === 0) return <span style={muted}>no baseline</span>;
  const sign = offset >= 0 ? "+" : "";
  return (
    <>
      {sign}
      {Math.round(offset)} lbs
      <br />
      <span style={muted}>
        est. from {sampleCount} session{sampleCount !== 1 ? "s" : ""}
      </span>
    </>
  );
}

export function VariantFactorCell({
  variantFactor,
}: {
  variantFactor: { factor: number; sampleCount: number; label: string } | undefined;
}) {
  if (variantFactor === undefined) return <>—</>;
  const { factor, sampleCount, label } = variantFactor;
  if (sampleCount === 0) return <span style={muted}>no baseline</span>;
  return (
    <>
      <span style={muted}>{label}</span>
      <br />
      {Math.round(factor * 100)}% of baseline
      <br />
      <span style={muted}>
        est. from {sampleCount} session{sampleCount !== 1 ? "s" : ""}
      </span>
    </>
  );
}

export function LastSessionCell({
  sessionE1RM,
  lastDate,
  setsReps,
}: {
  sessionE1RM: number | undefined;
  lastDate: Date | undefined;
  setsReps: string | null;
}) {
  if (sessionE1RM === undefined || !lastDate || !setsReps) return <>—</>;
  return (
    <>
      <span style={muted}>
        {lastDate.toLocaleDateString()} · {setsReps}
      </span>
      <br />
      {Math.round(sessionE1RM)} lbs
    </>
  );
}

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

export function ChainOffsetCell({
  chainOffset,
}: {
  chainOffset: { offset: number; sampleCount: number } | undefined;
}) {
  if (chainOffset === undefined) return <>—</>;
  const { offset, sampleCount } = chainOffset;
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

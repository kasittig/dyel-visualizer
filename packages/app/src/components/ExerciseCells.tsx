import { memo } from "react";

const muted: React.CSSProperties = {
  color: "var(--text)",
  fontSize: "0.85rem",
  whiteSpace: "nowrap",
};

export const OneRepMaxCell = memo(function OneRepMaxCell({
  one,
  unit = "lbs",
}: {
  one: { date: Date; weight: number } | undefined;
  unit?: "lbs" | "kg";
}) {
  if (!one) return <>—</>;
  return (
    <>
      <span style={muted}>{one.date.toLocaleDateString()}</span>
      <br />
      {one.weight} {unit}
    </>
  );
});

export const PredictedE1RMCell = memo(function PredictedE1RMCell({
  predicted,
  unit = "lbs",
}: {
  predicted: number | null | undefined;
  unit?: "lbs" | "kg";
}) {
  if (predicted == null) return <>—</>;
  return (
    <>
      {Math.round(predicted)} {unit}
    </>
  );
});

export const AddlWtOffsetCell = memo(function AddlWtOffsetCell({
  addlWtOffset,
  unit = "lbs",
}: {
  addlWtOffset: { offset: number; sampleCount: number } | undefined;
  unit?: "lbs" | "kg";
}) {
  if (addlWtOffset === undefined) return <>—</>;
  const { offset, sampleCount } = addlWtOffset;
  if (sampleCount === 0) return <span style={muted}>no baseline</span>;
  const sign = offset >= 0 ? "+" : "";
  return (
    <>
      {sign}
      {Math.round(offset)} {unit}
      <br />
      <span style={muted}>
        est. from {sampleCount} session{sampleCount !== 1 ? "s" : ""}
      </span>
    </>
  );
});

export const VariantFactorCell = memo(function VariantFactorCell({
  variantFactor,
}: {
  variantFactor:
    | { factor: number; sampleCount: number; label: string; baselineName: string }
    | undefined;
}) {
  if (variantFactor === undefined) return <>—</>;
  const { factor, sampleCount, label, baselineName } = variantFactor;
  if (sampleCount === 0) return <span style={muted}>no baseline</span>;
  return (
    <>
      <span style={muted}>{label}</span>
      <br />
      {Math.round(factor * 100)}% of {baselineName}
      <br />
      <span style={muted}>
        est. from {sampleCount} session{sampleCount !== 1 ? "s" : ""}
      </span>
    </>
  );
});

export const LastSessionCell = memo(function LastSessionCell({
  sessionE1RM,
  lastDate,
  setsReps,
  unit = "lbs",
}: {
  sessionE1RM: number | undefined;
  lastDate: Date | undefined;
  setsReps: string | null;
  unit?: "lbs" | "kg";
}) {
  if (sessionE1RM === undefined || !lastDate || !setsReps) return <>—</>;
  return (
    <>
      <span style={muted}>
        {lastDate.toLocaleDateString()} · {setsReps}
      </span>
      <br />
      {Math.round(sessionE1RM)} {unit}
    </>
  );
});

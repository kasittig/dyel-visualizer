import { useState, useMemo } from "react";
import type { ParsedConjugateRow } from "../utils/parseConjugate";
import type { ConjugateLift } from "../types/conjugate";
import { calcTargetWeight } from "../utils/calcTargetWeight";
import type { FitResult } from "../utils/fitAccommodatingOffset";

const REP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function offsetDescription(fit: FitResult, label: string): string | null {
  if (fit.modifiedSetCount === 0) return null;
  const lbs = Math.round(fit.offset);
  const prefix =
    fit.nominalModifierWeight !== null
      ? `${Math.round(fit.nominalModifierWeight)} lb ${label}`
      : label;
  switch (fit.method) {
    case "paired_blocks":
      return `${prefix}: effective weight ${lbs} lbs (${fit.pairedBlockCount} paired blocks)`;
    case "global_mean":
      return `${prefix}: effective weight ${lbs} lbs (estimated from session averages — add paired straight/${label} blocks to improve)`;
    case "default":
      return `${prefix}: assumed ${lbs} lbs effective (no straight work to calibrate from)`;
  }
}

interface Props {
  rows: ParsedConjugateRow[];
  liftType: ConjugateLift["liftType"];
}

export function ConjugateWeightCalculator({ rows, liftType }: Props) {
  const [targetReps, setTargetReps] = useState(3);

  const result = useMemo(
    () => calcTargetWeight(rows, liftType, targetReps),
    [rows, liftType, targetReps]
  );

  const containerStyle: React.CSSProperties = {
    marginBottom: "1rem",
    padding: "0.75rem",
    background: "#f9fafb",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
  };

  if (!result) {
    return (
      <div style={containerStyle}>
        <strong>Weight Calculator</strong>
        <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.5rem 0 0" }}>
          No recent sessions — log some {liftType} sets in the last 12 weeks to get a
          recommendation.
        </p>
      </div>
    );
  }

  const { targetWeight, workingE1RM, fitMeta, sessionCount } = result;

  const chainDesc = offsetDescription(fitMeta.chains, "chain");
  const bandDesc = offsetDescription(fitMeta.bands, "band");
  const revBandDesc = offsetDescription(fitMeta.reverseBands, "reverse band");
  const hasUncalibratedModifier =
    (fitMeta.chains.modifiedSetCount > 0 && fitMeta.chains.method !== "paired_blocks") ||
    (fitMeta.bands.modifiedSetCount > 0 && fitMeta.bands.method !== "paired_blocks") ||
    (fitMeta.reverseBands.modifiedSetCount > 0 && fitMeta.reverseBands.method !== "paired_blocks");

  return (
    <div style={containerStyle}>
      <strong>Weight Calculator</strong>
      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {REP_OPTIONS.map((r) => (
          <button
            key={r}
            onClick={() => setTargetReps(r)}
            style={{
              padding: "0.25rem 0.6rem",
              border: "1px solid",
              borderColor: r === targetReps ? "#6366f1" : "#d1d5db",
              borderRadius: "4px",
              background: r === targetReps ? "#6366f1" : "white",
              color: r === targetReps ? "white" : "#374151",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {r}
          </button>
        ))}
      </div>
      <p style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0.5rem 0 0.1rem" }}>
        {targetWeight} lbs
      </p>
      <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: 0 }}>
        e1RM: {workingE1RM} lbs &middot; {sessionCount} session{sessionCount !== 1 ? "s" : ""} (last
        12 wks)
      </p>
      {(chainDesc || bandDesc || revBandDesc) && (
        <div
          style={{
            fontSize: "0.75rem",
            color: hasUncalibratedModifier ? "#d97706" : "#6b7280",
            marginTop: "0.35rem",
          }}
        >
          {chainDesc && <div>{chainDesc}</div>}
          {bandDesc && <div>{bandDesc}</div>}
          {revBandDesc && <div>{revBandDesc}</div>}
        </div>
      )}
    </div>
  );
}

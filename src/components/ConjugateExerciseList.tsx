import type { SheetRow } from "../hooks/useSheetData";
import { findCol } from "../hooks/useSheetData";
import type { ConjugateLift } from "../types/conjugate";
import { calcE1RM } from "../utils/calcE1RM";
import { conjugateLiftLabel, parseConjugateLift } from "../utils/parseConjugate";

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function ConjugateExerciseList({
  rows,
  liftType,
  hidden,
  onToggle,
}: {
  rows: SheetRow[];
  liftType: ConjugateLift["liftType"];
  hidden: Set<string>;
  onToggle: (label: string) => void;
}) {
  const lastPerformed = new Map<string, Date>();
  const last1RepSet = new Map<string, { date: Date; weight: number }>();
  const lastSessionE1RM = new Map<string, number>();

  for (const row of rows) {
    const parsed = parseConjugateLift(row["exercise"]?.trim() ?? "");
    if (!parsed || parsed.liftType !== liftType) continue;
    const label = conjugateLiftLabel(parsed);
    const date = parseDate(row["date"]?.trim() ?? "");
    if (!date) continue;

    const existing = lastPerformed.get(label);
    if (!existing || date > existing) lastPerformed.set(label, date);

    const weight = parseFloat(findCol(row, "weight") ?? "");
    const repsStr = row["reps"]?.trim() ?? "";
    if (!isNaN(weight) && repsStr === "1") {
      const prev = last1RepSet.get(label);
      if (!prev || date > prev.date) last1RepSet.set(label, { date, weight });
    }
  }

  for (const row of rows) {
    const parsed = parseConjugateLift(row["exercise"]?.trim() ?? "");
    if (!parsed || parsed.liftType !== liftType) continue;
    const label = conjugateLiftLabel(parsed);
    const date = parseDate(row["date"]?.trim() ?? "");
    if (!date) continue;

    const lastDate = lastPerformed.get(label);
    if (!lastDate || date.getTime() !== lastDate.getTime()) continue;

    const weight = parseFloat(findCol(row, "weight") ?? "");
    const reps = parseFloat(row["reps"] ?? "");
    if (!isNaN(weight) && !isNaN(reps) && reps > 0) {
      const e1rm = calcE1RM(weight, reps);
      const prev = lastSessionE1RM.get(label);
      if (prev === undefined || e1rm > prev) lastSessionE1RM.set(label, e1rm);
    }
  }

  const variations = [...lastPerformed.keys()].sort();
  if (variations.length === 0) return <p>No {liftType} data found.</p>;

  return (
    <section>
      <h2>Variations</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>Variation</th>
            <th style={th}>Last 1RM</th>
            <th style={th}>Latest e1RM</th>
          </tr>
        </thead>
        <tbody>
          {variations.map((label) => {
            const one = last1RepSet.get(label);
            const sessionE1RM = lastSessionE1RM.get(label);
            const isHidden = hidden.has(label);
            return (
              <tr
                key={label}
                onClick={() => onToggle(label)}
                style={{ opacity: isHidden ? 0.4 : 1, cursor: "pointer" }}
              >
                <td style={td}>{label}</td>
                <td style={td}>
                  {one ? `${one.date.toLocaleDateString()} · ${one.weight} lbs` : "—"}
                </td>
                <td style={td}>
                  {sessionE1RM !== undefined ? `${Math.round(sessionE1RM)} lbs` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "center",
  padding: "0.5rem 1rem",
  borderBottom: "2px solid #ccc",
};

const td: React.CSSProperties = {
  padding: "0.4rem 1rem",
  borderBottom: "1px solid #eee",
};

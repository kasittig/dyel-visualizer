import { useMemo } from "react";
import { generateDiagnostics } from "@dyel/core";
import type { DeadliftStancePreference } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";

function formatCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const cellStyle: React.CSSProperties = { padding: "0.5rem 0.75rem" };
const monoStyle: React.CSSProperties = {
  ...cellStyle,
  fontFamily: "var(--mono)",
  textAlign: "right",
};

export function DiagnosticsPanel({
  rows,
  deadliftStance,
}: {
  rows: ConjugateDataPair[];
  deadliftStance?: DeadliftStancePreference;
}) {
  const hasDeadlift = rows.some(([ex]) => ex.type === "deadlift");

  const results = useMemo(
    () =>
      generateDiagnostics(rows, { deadliftStance }).filter((r) => r.category !== "unclassified"),
    [rows, deadliftStance]
  );

  if (results.length === 0 && !hasDeadlift) return null;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h2>Weakness Diagnostics</h2>
      {results.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                color: "var(--text)",
                fontWeight: 600,
              }}
            >
              <th style={{ ...cellStyle, textAlign: "left" }}>Variation</th>
              <th style={{ ...cellStyle, textAlign: "left" }}>Category</th>
              <th style={{ ...monoStyle }}>Avg Index</th>
              <th style={{ ...monoStyle }}>Baseline Range</th>
              <th style={{ ...cellStyle, textAlign: "left" }}>Diagnostic</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isOptimal = r.diagnostic.startsWith("Optimal");
              return (
                <tr key={r.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={cellStyle}>{r.name}</td>
                  <td style={{ ...cellStyle, color: "var(--text)" }}>
                    {formatCategory(r.category)}
                  </td>
                  <td style={monoStyle}>{r.averageIndex.toFixed(1)}%</td>
                  <td style={monoStyle}>{r.expectedBaseline}</td>
                  <td
                    style={{
                      ...cellStyle,
                      color: isOptimal ? "var(--success)" : "var(--danger)",
                      fontWeight: 600,
                    }}
                  >
                    {isOptimal ? "Optimal" : "Weakness"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

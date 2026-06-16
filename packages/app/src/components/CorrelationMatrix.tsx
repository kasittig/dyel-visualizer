const CELL_SIZE = 44;
const LABEL_COL_WIDTH = 160;
const HEADER_HEIGHT = 130;

const LIFT_COLORS: Record<string, string> = {
  squat: "#e67e22",
  bench: "#3498db",
  deadlift: "#2ecc71",
};

function correlationColor(r: number): string {
  if (isNaN(r)) return "hsl(0, 0%, 88%)";
  if (r >= 0) {
    const s = Math.round(r * 72);
    const l = Math.round(95 - r * 50);
    return `hsl(200, ${s}%, ${l}%)`;
  }
  const pct = -r;
  const s = Math.round(pct * 72);
  const l = Math.round(95 - pct * 40);
  return `hsl(20, ${s}%, ${l}%)`;
}

function cellTextColor(r: number): string {
  return !isNaN(r) && Math.abs(r) > 0.5 ? "#fff" : "#333";
}

export function CorrelationMatrix({
  matrix,
  labels,
  competitionLabels,
  liftTypes,
  title,
}: {
  matrix: number[][];
  labels: string[];
  competitionLabels?: Set<string>;
  liftTypes?: Record<string, string>;
  title?: string;
}) {
  if (labels.length < 2) return null;

  return (
    <section style={{ marginTop: "2rem" }}>
      <h3 style={{ fontSize: "0.95rem", marginBottom: "0.25rem" }}>
        {title ?? "Variation Correlation (e1RM time series)"}
      </h3>
      <p
        style={{ fontSize: "0.75rem", color: "var(--text)", marginBottom: "0.75rem", marginTop: 0 }}
      >
        Pearson r between weekly interpolated e1RM. Cells marked — have fewer than 5 weeks of shared
        training history.
      </p>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "inline-block", minWidth: "max-content" }}>
          {/* Column headers */}
          <div style={{ display: "flex", paddingLeft: LABEL_COL_WIDTH }}>
            {labels.map((label) => {
              const isCompetition = competitionLabels?.has(label);
              const liftColor = liftTypes ? LIFT_COLORS[liftTypes[label]] : undefined;
              return (
                <div
                  key={label}
                  style={{ width: CELL_SIZE, position: "relative", height: HEADER_HEIGHT }}
                >
                  <span
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: CELL_SIZE / 2,
                      transform: "rotate(-45deg)",
                      transformOrigin: "bottom left",
                      whiteSpace: "nowrap",
                      fontSize: 11,
                      fontWeight: isCompetition ? 700 : 400,
                      color: liftColor ?? "var(--text-h)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {labels.map((rowLabel, i) => {
            const isCompetitionRow = competitionLabels?.has(rowLabel);
            const liftColor = liftTypes ? LIFT_COLORS[liftTypes[rowLabel]] : undefined;
            return (
              <div key={rowLabel} style={{ display: "flex", alignItems: "center" }}>
                {/* Row label */}
                <div
                  style={{
                    width: LABEL_COL_WIDTH,
                    textAlign: "right",
                    paddingRight: 8,
                    fontSize: 11,
                    fontWeight: isCompetitionRow ? 700 : 400,
                    color: liftColor ?? "var(--text-h)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={rowLabel}
                >
                  {rowLabel}
                </div>

                {/* Cells */}
                {labels.map((colLabel, j) => {
                  const r = matrix[i]?.[j];
                  const rVal = r ?? NaN;
                  const isCompetitionCol = competitionLabels?.has(colLabel);
                  const highlight = isCompetitionRow || isCompetitionCol;
                  const tooltipText =
                    i === j
                      ? rowLabel
                      : `${rowLabel} ↔ ${colLabel}: r = ${isNaN(rVal) ? "insufficient data" : rVal.toFixed(2)}`;
                  return (
                    <div
                      key={colLabel}
                      title={tooltipText}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: correlationColor(rVal),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: cellTextColor(rVal),
                        cursor: "default",
                        boxSizing: "border-box",
                        border: highlight
                          ? "1.5px solid rgba(0,0,0,0.25)"
                          : "1px solid rgba(0,0,0,0.06)",
                        flexShrink: 0,
                      }}
                    >
                      {i === j ? "1.00" : isNaN(rVal) ? "—" : rVal.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import type { SheetRow } from "../hooks/useSheetData";
import type { ConjugateLift } from "../types/conjugate";
import type { AttrFilter } from "../utils/conjugateFilter";
import { ATTRIBUTE_LABELS, liftAttributes } from "../utils/conjugateFilter";
import { parseConjugateLift } from "../utils/parseConjugate";

export function ConjugateFilters({
  rows,
  liftType,
  filters,
  onToggle,
}: {
  rows: SheetRow[];
  liftType: ConjugateLift["liftType"];
  filters: Map<string, AttrFilter>;
  onToggle: (key: string, side: "with" | "without") => void;
}) {
  const presentKeys = new Set<string>();
  for (const row of rows) {
    const parsed = parseConjugateLift(row["exercise"]?.trim() ?? "");
    if (!parsed || parsed.liftType !== liftType) continue;
    for (const key of liftAttributes(parsed)) {
      presentKeys.add(key);
    }
  }

  if (presentKeys.size === 0) return null;

  const attrs = Object.keys(ATTRIBUTE_LABELS).filter((k) => presentKeys.has(k));

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr>
            <th style={th} />
            <th style={{ ...th, fontWeight: 400, color: "#6b7280" }}>With</th>
            <th style={{ ...th, fontWeight: 400, color: "#6b7280" }}>Without</th>
          </tr>
        </thead>
        <tbody>
          {attrs.map((key) => {
            const f = filters.get(key);
            const showWith = f?.with ?? true;
            const showWithout = f?.without ?? true;
            return (
              <tr key={key}>
                <td style={td}>{ATTRIBUTE_LABELS[key]}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={showWith}
                    onChange={() => onToggle(key, "with")}
                  />
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={showWithout}
                    onChange={() => onToggle(key, "without")}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "0.2rem 0.75rem",
  textAlign: "center",
};

const td: React.CSSProperties = {
  padding: "0.2rem 0.75rem",
};

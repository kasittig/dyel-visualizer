import type { SheetRow } from "../hooks/useSheetData";

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function ExerciseList({ rows }: { rows: SheetRow[] }) {
  const lastPerformed = new Map<string, Date>();

  for (const row of rows) {
    const exercise = row["Exercise"]?.trim();
    const date = parseDate(row["Date"]?.trim());
    if (!exercise || !date) continue;
    const existing = lastPerformed.get(exercise);
    if (!existing || date > existing) lastPerformed.set(exercise, date);
  }

  const entries = [...lastPerformed.entries()].sort(
    ([, a], [, b]) => b.getTime() - a.getTime()
  );

  if (entries.length === 0) return <p>No exercise data found.</p>;

  return (
    <section>
      <h2>Exercises</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={th}>Exercise</th>
            <th style={th}>Last Performed</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([exercise, date]) => (
            <tr key={exercise}>
              <td style={td}>{exercise}</td>
              <td style={td}>{date.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 1rem",
  borderBottom: "2px solid #ccc",
};

const td: React.CSSProperties = {
  padding: "0.4rem 1rem",
  borderBottom: "1px solid #eee",
};

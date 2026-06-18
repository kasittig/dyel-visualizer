import { useState } from "react";
import { useSheetValidation } from "../hooks/useSheetValidation";
import type { SheetValidationResult, ColumnInfo } from "@dyel/core";
import { EXAMPLE_SHEET_URL } from "../utils/appUtils";

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        color: ok ? "var(--success)" : "var(--danger)",
        fontWeight: 600,
        marginRight: "0.4rem",
      }}
    >
      {ok ? "✓" : "✗"}
    </span>
  );
}

function VerdictBanner({ result }: { result: SheetValidationResult }) {
  const color =
    result.verdict === "ok"
      ? "var(--success)"
      : result.verdict === "warning"
        ? "var(--warning)"
        : "var(--danger)";
  const icon = result.verdict === "ok" ? "✓" : result.verdict === "warning" ? "⚠" : "✗";
  const message =
    result.verdict === "ok"
      ? "Your sheet is compatible with DYEL Visualizer."
      : result.verdict === "warning"
        ? "Your sheet will mostly work, but there are some issues to review."
        : "Your sheet won't work with DYEL Visualizer. See the issues below.";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1rem 1.25rem",
        borderRadius: "8px",
        border: `1.5px solid ${color}`,
        background: `color-mix(in srgb, ${color} 8%, var(--bg))`,
        marginBottom: "1.5rem",
      }}
    >
      <span style={{ fontSize: "1.5rem", color, lineHeight: 1 }}>{icon}</span>
      <span style={{ color: "var(--text-h)", fontWeight: 500 }}>{message}</span>
    </div>
  );
}

function ColumnChecklist({ columns }: { columns: ColumnInfo }) {
  const weightLabel = columns.weightUnit
    ? `weight (${columns.weightUnit})`
    : columns.hasWeight
      ? "weight (no unit — will assume lbs)"
      : "weight";

  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginBottom: "0.75rem" }}>Columns</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.95rem" }}>
        {(
          [
            { label: "exercise", ok: columns.hasExercise },
            { label: "date", ok: columns.hasDate },
            { label: weightLabel, ok: columns.hasWeight },
            { label: "reps", ok: columns.hasReps },
            {
              label: columns.hasSets ? "sets" : "sets (optional — not found, defaults to 1)",
              ok: true,
            },
          ] as const
        ).map(({ label, ok }) => (
          <li key={label} style={{ padding: "0.3rem 0", color: "var(--text-h)" }}>
            <Check ok={ok} />
            <code>{label}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowSummary({ rows }: { rows: SheetValidationResult["rows"] }) {
  if (rows.total === 0) return null;
  const { total, parsed, liftTypes } = rows;
  const skipped = total - parsed;

  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginBottom: "0.75rem" }}>Rows</h2>
      <p style={{ color: "var(--text-h)", marginBottom: "0.5rem" }}>
        <strong>
          {parsed} of {total}
        </strong>{" "}
        row{total === 1 ? "" : "s"} parsed successfully
        {skipped > 0 && (
          <span style={{ color: "var(--danger)", marginLeft: "0.4rem" }}>({skipped} skipped)</span>
        )}
      </p>
      {parsed > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            fontSize: "0.9rem",
            color: "var(--text)",
          }}
        >
          {(["squat", "bench", "deadlift", "accessory"] as const).map((t) => (
            <li key={t} style={{ padding: "0.2rem 0" }}>
              <span style={{ textTransform: "capitalize", marginRight: "0.4rem" }}>{t}:</span>
              <strong style={{ color: "var(--text-h)" }}>{liftTypes[t]}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function IssueList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginBottom: "0.75rem", color }}>{title}</h2>
      <ul
        style={{ padding: "0 0 0 1.25rem", margin: 0, fontSize: "0.95rem", color: "var(--text-h)" }}
      >
        {items.map((item, i) => (
          <li key={i} style={{ padding: "0.25rem 0" }}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowIssueList({ rowIssues }: { rowIssues: SheetValidationResult["rowIssues"] }) {
  if (rowIssues.length === 0) return null;
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ marginBottom: "0.75rem", color: "var(--danger)" }}>Row Issues</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rowIssues.map(
          ({ row, exercise, issues }: { row: number; exercise: string; issues: string[] }) => (
            <div
              key={row}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--code-bg)",
                fontSize: "0.9rem",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-h)", marginBottom: "0.3rem" }}>
                Data row {row}{" "}
                <span style={{ fontWeight: 400, color: "var(--text)" }}>— {exercise}</span>
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 1.25rem" }}>
                {issues.map((issue: string, i: number) => (
                  <li key={i} style={{ color: "var(--text-h)", padding: "0.1rem 0" }}>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function ValidationResults({
  result,
  sheetUrl,
}: {
  result: SheetValidationResult;
  sheetUrl: string;
}) {
  const visualizerUrl = `${window.location.pathname}?sheet=${encodeURIComponent(sheetUrl)}`;

  return (
    <div>
      <VerdictBanner result={result} />
      <ColumnChecklist columns={result.columns} />
      <RowSummary rows={result.rows} />
      <IssueList title="Issues to Fix" items={result.issues} color="var(--danger)" />
      <RowIssueList rowIssues={result.rowIssues} />
      <IssueList title="Warnings" items={result.warnings} color="var(--warning)" />
      {result.rows.parsed > 0 && (
        <a
          href={visualizerUrl}
          style={{
            display: "inline-block",
            marginTop: "0.5rem",
            padding: "0.6rem 1.25rem",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 500,
            fontSize: "0.95rem",
          }}
        >
          View in Visualizer →
        </a>
      )}
    </div>
  );
}

export function ValidatorPage() {
  const [url, setUrl] = useState("");
  const [validationState, validate] = useSheetValidation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    validate(url);
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "left" }}>
      <div style={{ textAlign: "center" }}>
        <h1>Sheet Validator</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "-0.5rem" }}>
          <a href="./" style={{ color: "var(--accent)" }}>
            ← Back to DYEL Visualizer
          </a>
        </p>
      </div>
      <br />

      <p style={{ color: "var(--text)", marginBottom: "1.25rem", textAlign: "center" }}>
        Paste your published Google Sheet URL below to check if it's compatible with DYEL
        Visualizer.
        <br /> <br />
        Don't have a sheet yet?{" "}
        <a
          href={EXAMPLE_SHEET_URL}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--accent)" }}
        >
          View the example spreadsheet.
        </a>
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          style={{ flex: 1, minWidth: "200px", padding: "0.5rem", boxSizing: "border-box" }}
        />
        <button
          type="submit"
          disabled={!url.trim() || validationState.status === "loading"}
          style={{
            padding: "0.5rem 1.25rem",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: url.trim() && validationState.status !== "loading" ? "pointer" : "not-allowed",
            fontWeight: 500,
            opacity: !url.trim() || validationState.status === "loading" ? 0.6 : 1,
          }}
        >
          {validationState.status === "loading" ? "Checking…" : "Check Sheet"}
        </button>
      </form>

      {validationState.status === "error" && (
        <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{validationState.message}</p>
      )}

      {validationState.status === "success" && (
        <ValidationResults result={validationState.result} sheetUrl={validationState.sheetUrl} />
      )}
    </main>
  );
}

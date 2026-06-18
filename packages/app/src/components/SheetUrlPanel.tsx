import type React from "react";
import { EXAMPLE_SHEET_URL, EXAMPLE_VISUALIZER_URL } from "../utils/appUtils";

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "var(--accent)",
  fontSize: "inherit",
  textDecoration: "underline",
};

/** App header: title plus the collapsible Google-Sheet URL input and helper links. */
export function SheetUrlPanel({
  showUrlPanel,
  url,
  loaded,
  invalidUrl,
  onUrlChange,
  onForceOpen,
  onCancel,
}: {
  showUrlPanel: boolean;
  url: string;
  loaded: boolean;
  invalidUrl: boolean;
  onUrlChange: (value: string) => void;
  onForceOpen: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <h1>DYEL Visualizer</h1>
      {!showUrlPanel ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "-0.5rem" }}>
          <button onClick={onForceOpen} style={linkButtonStyle}>
            Change sheet URL
          </button>
          {" · "}
          <a href="?page=conjugate" style={{ color: "var(--accent)" }}>
            What is the conjugate method?
          </a>
        </p>
      ) : (
        <>
          <p style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "-0.5rem" }}>
            {loaded ? (
              <button onClick={onCancel} style={linkButtonStyle}>
                Cancel
              </button>
            ) : (
              <a href="?page=conjugate" style={{ color: "var(--accent)" }}>
                What is the conjugate method?
              </a>
            )}
            {" · "}
            <a href="?page=validator" style={{ color: "var(--accent)" }}>
              Check if my spreadsheet will work
            </a>
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <label htmlFor="sheet-url" style={{ whiteSpace: "nowrap" }}>
              Your Google Sheet
            </label>
            <input
              id="sheet-url"
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              style={{ flex: 1, padding: "0.5rem", boxSizing: "border-box" }}
              autoFocus={loaded}
            />
          </div>
          {invalidUrl && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>
              That doesn't look like a Google Sheet URL.
            </p>
          )}
          <p style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "0.5rem" }}>
            Don't have a sheet?{" "}
            <a href={EXAMPLE_VISUALIZER_URL}>View an example in the visualizer</a>
            {" · "}
            <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
              View the example spreadsheet
            </a>
          </p>
        </>
      )}
    </div>
  );
}

import { useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import { useLastSessionStats } from "../hooks/useLastSessionStats";
import {
  AddlWtOffsetCell,
  LastSessionCell,
  OneRepMaxCell,
  PredictedE1RMCell,
  VariantFactorCell,
} from "./ExerciseCells";
import { setsRepsLabel } from "../utils/setsRepsLabel";
import { th, td } from "../utils/tableStyles";

export function ExerciseList({
  rows,
  hidden,
  onToggle,
  baselineNames = {},
  heading = "Exercises",
  columnHeader = "Movement",
  showSearch = false,
}: {
  rows: ConjugateDataPair[];
  hidden: Set<string>;
  onToggle: (label: string) => void;
  baselineNames?: Partial<Record<string, string>>;
  heading?: string;
  columnHeader?: string;
  showSearch?: boolean;
}) {
  const [query, setQuery] = useState("");

  const {
    lastPerformed,
    last1RepSet,
    lastSessionE1RM,
    lastSessionBestSet,
    lastSessionAllSets,
    predictedE1RM,
    addlWtOffset,
    variantFactor,
  } = useLastSessionStats(rows, baselineNames);

  const hasAddlWtExercises = addlWtOffset.size > 0;
  const hasVariantExercises = variantFactor.size > 0;
  const colSpan = 4 + (hasAddlWtExercises ? 1 : 0) + (hasVariantExercises ? 1 : 0);

  const allLabels = [...lastPerformed.keys()].sort();
  const visible = allLabels.filter((l) => !hidden.has(l));
  const minimized = allLabels.filter((l) => hidden.has(l));
  const labels = [...visible, ...minimized];
  const displayed =
    showSearch && query
      ? visible.filter((l) => l.toLowerCase().includes(query.toLowerCase()))
      : labels;

  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    if (tbodyRef.current) {
      setScrollMargin(tbodyRef.current.getBoundingClientRect().top + window.scrollY);
    }
  }, [showSearch]);

  const rowVirtualizer = useWindowVirtualizer({
    count: displayed.length,
    estimateSize: (i) => (hidden.has(displayed[i]) ? 36 : 64),
    overscan: 5,
    scrollMargin,
  });

  if (allLabels.length === 0) return <p>No data found.</p>;

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop =
    virtualItems.length > 0 ? virtualItems[0].start - rowVirtualizer.options.scrollMargin : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <section>
      <h2 style={{ textAlign: "center" }}>{heading}</h2>
      {showSearch && (
        <input
          type="search"
          placeholder={`Filter ${heading.toLowerCase()}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            boxSizing: "border-box",
            marginBottom: "0.75rem",
          }}
        />
      )}
      <table style={{ borderCollapse: "collapse", width: "100%", textAlign: "center" }}>
        <thead>
          <tr>
            <th style={th}>{columnHeader}</th>
            <th style={th}>Last 1RM</th>
            <th style={th}>Latest Session</th>
            <th style={th}>Predicted e1RM</th>
            {hasAddlWtExercises && <th style={th}>Resistance Offset</th>}
            {hasVariantExercises && <th style={th}>Variant Factor</th>}
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop, padding: 0, border: 0 }} colSpan={colSpan} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const label = displayed[virtualRow.index];
            const one = last1RepSet.get(label);
            const sessionE1RM = lastSessionE1RM.get(label);
            const lastDate = lastPerformed.get(label);
            const bestSet = lastSessionBestSet.get(label);
            const allSets = lastSessionAllSets.get(label) ?? [];
            const setsReps = setsRepsLabel(bestSet, allSets);
            const isHidden = hidden.has(label);
            if (isHidden) {
              return (
                <tr
                  key={label}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  onClick={() => onToggle(label)}
                  style={{ cursor: "pointer" }}
                >
                  <td
                    colSpan={colSpan}
                    style={{ ...td, color: "var(--text)", fontSize: "0.85rem" }}
                  >
                    {label}
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={label}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                onClick={() => onToggle(label)}
                style={{ cursor: "pointer" }}
              >
                <td style={td}>{label}</td>
                <td style={td}>
                  <OneRepMaxCell one={one} />
                </td>
                <td style={td}>
                  <LastSessionCell
                    sessionE1RM={sessionE1RM}
                    lastDate={lastDate}
                    setsReps={setsReps}
                  />
                </td>
                <td style={td}>
                  <PredictedE1RMCell predicted={predictedE1RM.get(label)} />
                </td>
                {hasAddlWtExercises && (
                  <td style={td}>
                    <AddlWtOffsetCell addlWtOffset={addlWtOffset.get(label)} />
                  </td>
                )}
                {hasVariantExercises && (
                  <td style={td}>
                    <VariantFactorCell variantFactor={variantFactor.get(label)} />
                  </td>
                )}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom, padding: 0, border: 0 }} colSpan={colSpan} />
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

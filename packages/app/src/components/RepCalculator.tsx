import { useState, useMemo, useEffect, useRef } from "react";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "./DateRangePicker";
import { findBestE1RM, predictWeightForReps, predictRepsForWeight } from "@dyel/core";
import type { ConjugateDataPair } from "../hooks/useConjugateData";
import type { E1RMEstimate, RepCalcStats } from "@dyel/core";

type LiftType = "squat" | "bench" | "deadlift" | "accessory";

const LIFT_LABELS: Record<LiftType, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
  accessory: "Accessory",
};

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

function sourceNote(estimate: E1RMEstimate): string {
  const date = estimate.date.toLocaleDateString();
  switch (estimate.method) {
    case "exact":
      return `Based on ${estimate.sourceName} · ${date}`;
    case "addlWtOffset":
      return `Based on ${estimate.sourceName} · ${date} · resistance offset adjusted`;
    case "variantFactor":
      return `Based on ${estimate.sourceName} · ${date} · variant factor applied`;
  }
}

export function RepCalculator({
  pairs,
  baselineNames,
  stats,
}: {
  pairs: ConjugateDataPair[];
  baselineNames: Partial<Record<string, string>>;
  stats: RepCalcStats;
}) {
  const [liftType, setLiftType] = useState<LiftType>("squat");
  const [selectedName, setSelectedName] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }));

  const unit = pairs[0]?.[1].unit ?? "lbs";

  const hasAccessories = useMemo(() => pairs.some(([ex]) => ex.type === "accessory"), [pairs]);

  const exercisesForType = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const [ex] of pairs) {
      if (ex.type !== liftType) continue;
      if (!seen.has(ex.displayName)) {
        seen.add(ex.displayName);
        result.push(ex.displayName);
      }
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [pairs, liftType]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedName(exercisesForType[0] ?? "");
    setReps("");
    setWeight("");
  }, [liftType, exercisesForType]);

  const sessionDates = useMemo(() => {
    const seen = new Set<string>();
    const dates: Date[] = [];
    for (const [ex, session] of pairs) {
      if (ex.type !== liftType) continue;
      const key = session.date.toDateString();
      if (!seen.has(key)) {
        seen.add(key);
        dates.push(session.date);
      }
    }
    return dates;
  }, [pairs, liftType]);

  const selectedExercise = useMemo(
    () => pairs.find(([ex]) => ex.displayName === selectedName)?.[0] ?? null,
    [pairs, selectedName]
  );

  const estimate = useMemo(() => {
    if (!selectedExercise || !dateRange.from || !dateRange.to) return null;
    return findBestE1RM(
      pairs,
      selectedExercise,
      stats,
      baselineNames[liftType],
      dateRange.from,
      dateRange.to
    );
  }, [pairs, selectedExercise, stats, baselineNames, liftType, dateRange]);

  // Keep a ref so the exercise-change effect always reads the current reps value
  // without reps being a dependency (which would cause circular updates when typing weight).
  const repsRef = useRef(reps);
  useEffect(() => {
    repsRef.current = reps;
  });

  useEffect(() => {
    if (!estimate) return;
    const r = parseFloat(repsRef.current);
    if (!isNaN(r) && r > 0) {
      setWeight(String(roundTo5(predictWeightForReps(estimate.e1rm, r))));
    }
  }, [estimate]);

  function handleRepsChange(val: string) {
    setReps(val);
    const r = parseFloat(val);
    if (!isNaN(r) && r > 0 && estimate) {
      setWeight(String(roundTo5(predictWeightForReps(estimate.e1rm, r))));
    }
  }

  function handleWeightChange(val: string) {
    setWeight(val);
    const w = parseFloat(val);
    if (!isNaN(w) && w > 0 && estimate) {
      setReps(predictRepsForWeight(estimate.e1rm, w).toFixed(1));
    }
  }

  const muted: React.CSSProperties = { color: "var(--text)", fontSize: "0.85rem" };
  const inputStyle: React.CSSProperties = {
    width: "6rem",
    padding: "0.4rem 0.5rem",
    fontSize: "1rem",
    textAlign: "center",
  };

  return (
    <section>
      <h2 style={{ textAlign: "center" }}>Rep Calculator</h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label htmlFor="calc-lift" style={muted}>
            Lift
          </label>
          <select
            id="calc-lift"
            value={liftType}
            onChange={(e) => setLiftType(e.target.value as LiftType)}
            style={{ fontSize: "1rem" }}
          >
            {(Object.keys(LIFT_LABELS) as LiftType[])
              .filter((t) => t !== "accessory" || hasAccessories)
              .map((t) => (
                <option key={t} value={t}>
                  {LIFT_LABELS[t]}
                </option>
              ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label htmlFor="calc-exercise" style={muted}>
            Exercise
          </label>
          <select
            id="calc-exercise"
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
            }}
            style={{ fontSize: "1rem" }}
          >
            {exercisesForType.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {exercisesForType.length === 0 ? (
        <p style={muted}>No {LIFT_LABELS[liftType].toLowerCase()} exercises found in your data.</p>
      ) : estimate === null ? (
        <p style={muted}>
          No session data found in the selected window — try widening the date range.
        </p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <label htmlFor="calc-reps" style={muted}>
                Reps
              </label>
              <input
                id="calc-reps"
                type="number"
                min="1"
                max="20"
                value={reps}
                onChange={(e) => handleRepsChange(e.target.value)}
                placeholder="—"
                style={inputStyle}
              />
            </div>

            <span
              style={{
                fontSize: "1.25rem",
                color: "var(--text)",
                alignSelf: "flex-end",
                paddingBottom: "0.35rem",
              }}
            >
              ↔
            </span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <label htmlFor="calc-weight" style={muted}>
                Weight ({unit})
              </label>
              <input
                id="calc-weight"
                type="number"
                min="0"
                value={weight}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="—"
                style={inputStyle}
              />
            </div>

            <div style={{ ...muted, alignSelf: "flex-end", paddingBottom: "0.5rem" }}>
              e1RM: {Math.round(estimate.e1rm)} {unit}
            </div>
          </div>

          <p style={{ ...muted, marginTop: 0 }}>{sourceNote(estimate)}</p>
        </>
      )}

      <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={muted}>Data window</span>
        <DateRangePicker value={dateRange} onChange={setDateRange} sessionDates={sessionDates} />
      </div>
    </section>
  );
}

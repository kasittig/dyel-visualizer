import Papa from "papaparse";
import { findCol } from "../hooks/useSheetData";
import { conjugateLiftLabel, parseConjugateLift } from "./parseConjugate";
import type {
  ConjugateAddlWt,
  ConjugateBar,
  ConjugateEquipment,
  ConjugateExercise,
  ConjugateLift,
  ConjugateStance,
  TrainingSession,
} from "../types/conjugate";

type RawRow = Record<string, string>;

function liftToExercise(lift: ConjugateLift): ConjugateExercise {
  const displayName = conjugateLiftLabel(lift);

  switch (lift.liftType) {
    case "squat": {
      const { bar, hasBox, hasChains, hasBands } = lift.variation;
      const addlWts: ConjugateAddlWt[] = [
        ...(hasChains ? (["chains"] as const) : []),
        ...(hasBands ? (["bands"] as const) : []),
      ];
      return {
        type: "squat",
        bar,
        stance: null,
        addlWts,
        equipment: hasBox ? "box" : null,
        displayName,
        sessions: [],
      };
    }

    case "bench": {
      const { bar, angle, grip, boardCount, hasSlingshot, hasChains, hasBands, hasPause } =
        lift.variation;

      const conjugateBar: ConjugateBar | null =
        bar === "bench_builder" ? null : (bar as ConjugateBar);

      const stance: ConjugateStance = hasSlingshot
        ? "slingshot"
        : bar === "bench_builder"
          ? "builder"
          : grip === "close"
            ? "close grip"
            : grip === "medium"
              ? "medium grip"
              : "competition grip";

      let equipment: ConjugateEquipment | null = null;
      if (angle === "incline") equipment = "incline";
      else if (angle === "decline") equipment = "decline";
      else if (angle === "floor") equipment = "floor";
      else if (boardCount === 1) equipment = "1 board";
      else if (boardCount === 2) equipment = "2 board";
      else if (boardCount === 3) equipment = "3 board";
      else if (hasPause) equipment = "pause";

      const addlWts: ConjugateAddlWt[] = [
        ...(hasChains ? (["chains"] as const) : []),
        ...(hasBands ? (["bands"] as const) : []),
      ];

      return {
        type: "bench",
        bar: conjugateBar,
        stance,
        addlWts,
        equipment,
        displayName,
        sessions: [],
      };
    }

    case "deadlift": {
      const { stance, hasChains, hasBands, hasReverseBands, blockHeight, deficitHeight } =
        lift.variation;
      const isTrapBar = stance === "trap bar";
      const addlWts: ConjugateAddlWt[] = [
        ...(hasChains ? (["chains"] as const) : []),
        ...(hasReverseBands ? (["rev. bands"] as const) : []),
        ...(hasBands ? (["bands"] as const) : []),
      ];
      return {
        type: "deadlift",
        bar: isTrapBar ? "trap bar" : null,
        stance: isTrapBar ? null : (stance as ConjugateStance),
        addlWts,
        equipment: blockHeight !== null ? "blocks" : deficitHeight !== null ? "deficit" : null,
        displayName,
        sessions: [],
      };
    }
  }
}

function parseSession(row: RawRow): TrainingSession | null {
  const dateStr = row["date"]?.trim() ?? "";
  const date = new Date(dateStr);
  if (!dateStr || isNaN(date.getTime())) return null;

  const weight = parseFloat(findCol(row, "weight") ?? "");
  const reps = parseInt(row["reps"] ?? "");
  if (isNaN(weight) || isNaN(reps) || reps <= 0) return null;

  const sets = parseInt(findCol(row, "sets") ?? "") || 1;
  return { date, sets, reps, weight };
}

export function parseConjugateData(csv: string): Array<[ConjugateExercise, TrainingSession]> {
  const lines = csv.trim().split("\n");
  const headerIdx = lines.findIndex((l) => l.toLowerCase().includes("exercise"));
  if (headerIdx === -1 || headerIdx >= lines.length - 1) return [];

  const rows = Papa.parse<RawRow>(lines.slice(headerIdx).join("\n"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  }).data;

  const result: Array<[ConjugateExercise, TrainingSession]> = [];
  for (const row of rows) {
    const lift = parseConjugateLift(row["exercise"] ?? "");
    if (!lift) continue;
    const session = parseSession(row);
    if (!session) continue;
    result.push([liftToExercise(lift), session]);
  }
  return result;
}

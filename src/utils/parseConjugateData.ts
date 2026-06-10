import Papa from "papaparse";
import { findCol } from "../hooks/useSheetData";
import {
  type ConjugateAddlWt,
  type ConjugateBar,
  type ConjugateEquipment,
  type ConjugateExercise,
  type ConjugateStance,
  type TrainingSession,
} from "../types/conjugate";

type RawRow = Record<string, string>;

export function nameToExercise(name: string): ConjugateExercise | null {
  const displayName = name;

  const lower = name.toLowerCase().trim();
  const parenIdx = lower.indexOf("(");
  const base = (parenIdx === -1 ? lower : lower.slice(0, parenIdx)).trim();
  const modStr =
    parenIdx === -1
      ? ""
      : lower
          .slice(parenIdx + 1)
          .replace(/\)/g, "")
          .trim();
  const modifiers = modStr ? modStr.split(",").map((m) => m.trim()) : [];

  const has = (phrase: string) => lower.includes(phrase);
  const tokens = new Set([...base.split(/\s+/), ...modifiers.flatMap((m) => m.split(/\s+/))]);
  const hasToken = (t: string) => tokens.has(t);

  function extractHeight(keyword: string): number | null {
    // Matches "2" keyword" or "2 keyword" (with or without inch mark)
    const re = new RegExp(
      `(\\d+(?:\\.\\d+)?)(?:\\s*")?\\s*${keyword}|${keyword}\\s*(\\d+(?:\\.\\d+)?)`,
      "i"
    );
    const m = lower.match(re);
    if (m) return parseFloat(m[1] ?? m[2]);
    return null;
  }

  const hasReverseBands = has("reverse band");
  const hasChains = has("chain");
  const hasBands = !hasReverseBands && has("band");
  const addlWts: ConjugateAddlWt[] = [
    ...(hasChains ? (["chains"] as const) : []),
    ...(hasBands ? (["bands"] as const) : []),
    ...(hasReverseBands ? (["rev. bands"] as const) : []),
  ];

  if (base.includes("squat") || base.includes("ssb")) {
    const bar = has("ssb") || has("safety") ? "ssb" : "standard";
    return {
      type: "squat",
      bar,
      stance: null,
      addlWts,
      equipment: has("box") ? "box" : null,
      displayName,
      sessions: [],
    };
  }

  if (
    base.includes("floor") ||
    base.includes("bench") ||
    base.includes("incline") ||
    base.includes("decline")
  ) {
    let bar: ConjugateBar = "standard";
    if (has("swiss")) bar = "swiss";
    else if (has("american")) bar = "american";
    else if (has("bamboo")) bar = "bamboo";
    else if (has("duffalo")) bar = "duffalo";
    else if (has("dumbbell") || hasToken("db")) bar = "dumbbell";

    const grip =
      hasToken("cg") || has("close grip") ? "close" : hasToken("medium") ? "medium" : "competition";

    const stance: ConjugateStance = has("slingshot")
      ? "slingshot"
      : has("builder")
        ? "builder"
        : grip === "close"
          ? "close grip"
          : grip === "medium"
            ? "medium grip"
            : "competition grip";

    let equipment: ConjugateEquipment | null = null;
    const boardCount = extractHeight("board");

    if (has("incline")) equipment = "incline";
    else if (has("decline")) equipment = "decline";
    else if (base.includes("floor")) equipment = "floor";
    else if (boardCount === 1) equipment = "1 board";
    else if (boardCount === 2) equipment = "2 board";
    else if (boardCount === 3) equipment = "3 board";
    else if (has("command")) equipment = "pause";

    const addlWts: ConjugateAddlWt[] = [
      ...(hasChains ? (["chains"] as const) : []),
      ...(hasBands ? (["bands"] as const) : []),
    ];

    return {
      type: "bench",
      bar: bar,
      stance,
      addlWts,
      equipment,
      displayName,
      sessions: [],
    };
  }

  if (base.includes("deadlift")) {
    const stanceTerms = ["romanian", "sumo", "conventional", "opposite"] as const;
    const stance = stanceTerms.find((t) => has(t)) ?? "competition";

    const isTrapBar = has("trap bar");
    const addlWts: ConjugateAddlWt[] = [
      ...(hasChains ? (["chains"] as const) : []),
      ...(hasReverseBands ? (["rev. bands"] as const) : []),
      ...(hasBands ? (["bands"] as const) : []),
    ];
    return {
      type: "deadlift",
      bar: isTrapBar ? "trap bar" : "standard",
      stance: stance as ConjugateStance,
      addlWts,
      equipment:
        extractHeight("block") !== null
          ? "blocks"
          : extractHeight("deficit") !== null
            ? "deficit"
            : null,
      displayName,
      sessions: [],
    };
  }
  return null;
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
    const exerciseName = row["exercise"] ?? "";
    if (!exerciseName) continue;
    const lift = nameToExercise(row["exercise"]);
    if (!lift) continue;
    const session = parseSession(row);
    if (!session) continue;
    result.push([lift, session]);
  }
  return result;
}

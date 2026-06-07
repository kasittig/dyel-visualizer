import type { BenchBar, ConjugateLift } from "../types/conjugate";
import {
  DEFAULT_BENCH_VARIATION,
  DEFAULT_DEADLIFT_VARIATION,
  DEFAULT_SQUAT_VARIATION,
} from "../types/conjugate";

export function parseConjugateLift(name: string): ConjugateLift | null {
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

  if (base.includes("squat")) {
    const hasReverseBands = has("reverse band");
    return {
      liftType: "squat",
      variation: {
        ...DEFAULT_SQUAT_VARIATION,
        bar: has("ssb") || has("safety") ? "ssb" : "standard",
        hasBox: has("box"),
        hasChains: has("chain"),
        hasBands: !hasReverseBands && has("band"),
      },
    };
  }

  if (
    base.includes("floor") ||
    base.includes("bench") ||
    base.includes("incline") ||
    base.includes("decline")
  ) {
    let bar: BenchBar = "standard";
    if (base.includes("bench builder")) bar = "bench_builder";
    else if (has("swiss")) bar = "swiss";
    else if (has("american")) bar = "american";
    else if (has("bamboo")) bar = "bamboo";
    else if (has("dumbbell") || hasToken("db")) bar = "dumbbell";

    const hasReverseBands = has("reverse band");
    return {
      liftType: "bench",
      variation: {
        ...DEFAULT_BENCH_VARIATION,
        bar,
        angle: has("incline") ? "incline" : has("decline") ? "decline" : "flat",
        grip:
          hasToken("cg") || has("close grip")
            ? "close"
            : hasToken("medium")
              ? "medium"
              : "competition",
        hasChains: has("chain"),
        hasBands: !hasReverseBands && has("band"),
        isFloorPress: base.includes("floor"),
        boardHeight: extractHeight("board"),
        hasSlingshot: has("slingshot"),
        hasPause: has("command"),
      },
    };
  }

  if (base.includes("deadlift")) {
    const hasReverseBands = has("reverse band");
    return {
      liftType: "deadlift",
      variation: {
        ...DEFAULT_DEADLIFT_VARIATION,
        isReverseStance: has("opposite"),
        hasChains: has("chain"),
        hasBands: !hasReverseBands && has("band"),
        hasReverseBands,
        blockHeight: extractHeight("block"),
        deficitHeight: extractHeight("deficit"),
      },
    };
  }

  return null;
}

const BENCH_BAR_LABELS: Partial<Record<BenchBar, string>> = {
  american: "American Bar",
  swiss: "Swiss Bar",
  bamboo: "Bamboo Bar",
  dumbbell: "Dumbbell",
};

export function conjugateLiftLabel(lift: ConjugateLift): string {
  switch (lift.liftType) {
    case "squat": {
      const { bar, hasBox, hasChains, hasBands } = lift.variation;
      const parts: string[] = [];
      if (bar === "ssb") parts.push("SSB");
      if (hasBox) parts.push("Box");
      parts.push("Squat");
      const equip: string[] = [];
      if (hasChains) equip.push("Chains");
      if (hasBands) equip.push("Bands");
      if (equip.length) parts.push(`w/ ${equip.join(" & ")}`);
      return parts.join(" ");
    }
    case "bench": {
      const {
        bar,
        angle,
        grip,
        isFloorPress,
        boardHeight,
        hasSlingshot,
        hasChains,
        hasBands,
        hasPause,
      } = lift.variation;
      const parts: string[] = [];
      const barLabel = BENCH_BAR_LABELS[bar];
      if (barLabel) parts.push(barLabel);
      if (grip === "close") parts.push("Close Grip");
      else if (grip === "medium") parts.push("Medium Grip");
      if (bar === "bench_builder") parts.push("Bench Builder");
      else if (isFloorPress) parts.push("Floor Press");
      else if (angle === "incline") parts.push("Incline Bench Press");
      else if (angle === "decline") parts.push("Decline Bench Press");
      else parts.push("Bench Press");
      const equip: string[] = [];
      if (boardHeight !== null) equip.push(`${boardHeight}" Board`);
      if (hasSlingshot) equip.push("Slingshot");
      if (hasChains) equip.push("Chains");
      if (hasBands) equip.push("Bands");
      if (hasPause) equip.push("Commands");
      if (equip.length) parts.push(`w/ ${equip.join(", ")}`);
      return parts.join(" ");
    }
    case "deadlift": {
      const { isReverseStance, hasChains, hasBands, hasReverseBands, blockHeight, deficitHeight } =
        lift.variation;
      const parts: string[] = [];
      if (isReverseStance) parts.push("Opposite");
      if (blockHeight !== null) parts.push(`${blockHeight}"`);
      if (deficitHeight !== null) parts.push(`${deficitHeight}" Deficit`);
      parts.push("Deadlift");
      const equip: string[] = [];
      if (hasChains) equip.push("Chains");
      if (hasReverseBands) equip.push("Reverse Bands");
      if (hasBands) equip.push("Bands");
      if (equip.length) parts.push(`w/ ${equip.join(" & ")}`);
      return parts.join(" ");
    }
  }
}

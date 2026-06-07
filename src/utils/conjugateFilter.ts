import type { ConjugateLift } from "../types/conjugate";

export const ATTRIBUTE_LABELS: Record<string, string> = {
  hasChains: "Chains",
  hasBands: "Bands",
  hasBox: "Box",
  "bar:ssb": "Safety Bar",
  isReverseStance: "Sumo",
  hasReverseBands: "Reverse Bands",
  hasBlock: "Block Pull",
  hasDeficit: "Deficit",
  isFloorPress: "Floor Press",
  hasSlingshot: "Slingshot",
  hasPause: "Commands",
  "angle:incline": "Incline",
  "angle:decline": "Decline",
  "grip:close": "Close Grip",
  "grip:medium": "Medium Grip",
  "bar:swiss": "Swiss Bar",
  "bar:american": "American Bar",
  "bar:bamboo": "Bamboo Bar",
  "bar:dumbbell": "Dumbbell",
  "bar:bench_builder": "Bench Builder",
};

export function liftAttributes(lift: ConjugateLift): Set<string> {
  const keys = new Set<string>();
  switch (lift.liftType) {
    case "squat": {
      const { bar, hasBox, hasChains, hasBands } = lift.variation;
      if (bar === "ssb") keys.add("bar:ssb");
      if (hasBox) keys.add("hasBox");
      if (hasChains) keys.add("hasChains");
      if (hasBands) keys.add("hasBands");
      break;
    }
    case "bench": {
      const { bar, angle, grip, isFloorPress, hasSlingshot, hasChains, hasBands, hasPause } =
        lift.variation;
      if (bar !== "standard") keys.add(`bar:${bar}`);
      if (angle === "incline") keys.add("angle:incline");
      if (angle === "decline") keys.add("angle:decline");
      if (grip === "close") keys.add("grip:close");
      if (grip === "medium") keys.add("grip:medium");
      if (isFloorPress) keys.add("isFloorPress");
      if (hasSlingshot) keys.add("hasSlingshot");
      if (hasChains) keys.add("hasChains");
      if (hasBands) keys.add("hasBands");
      if (hasPause) keys.add("hasPause");
      break;
    }
    case "deadlift": {
      const { isReverseStance, hasChains, hasBands, hasReverseBands, blockHeight, deficitHeight } =
        lift.variation;
      if (isReverseStance) keys.add("isReverseStance");
      if (hasChains) keys.add("hasChains");
      if (hasBands) keys.add("hasBands");
      if (hasReverseBands) keys.add("hasReverseBands");
      if (blockHeight !== null) keys.add("hasBlock");
      if (deficitHeight !== null) keys.add("hasDeficit");
      break;
    }
  }
  return keys;
}

// Each attribute entry controls whether to include variations WITH or WITHOUT that attribute.
// Absent from the map means "show both" (no filter on that attribute).
export type AttrFilter = { with: boolean; without: boolean };

export function meetsFilter(lift: ConjugateLift, filters: Map<string, AttrFilter>): boolean {
  if (filters.size === 0) return true;
  const attrs = liftAttributes(lift);
  for (const [key, f] of filters) {
    const has = attrs.has(key);
    if (has && !f.with) return false;
    if (!has && !f.without) return false;
  }
  return true;
}

import type { ConjugateExercise, MovementCategory } from "../types/conjugate";

const LOCKOUT_EQUIPMENT = new Set(["board", "floor", "blocks", "rack"]);
const BOTTOM_RANGE_EQUIPMENT = new Set(["deficit", "pause"]);
const QUAD_DOMINANT_BARS = new Set(["ssb", "goblet", "trap"]);

export function toMovementCategory(ex: ConjugateExercise): MovementCategory {
  if (ex.stance === "competition") return "anchor";
  if ((ex.equipment !== null && LOCKOUT_EQUIPMENT.has(ex.equipment)) || ex.stance === "close")
    return "lockout";
  if (ex.equipment !== null && BOTTOM_RANGE_EQUIPMENT.has(ex.equipment)) return "bottom_range";
  if (
    ex.type === "squat" &&
    ((ex.bar !== null && QUAD_DOMINANT_BARS.has(ex.bar)) || ex.stance === "front")
  )
    return "quad_dominant";
  if (ex.type === "deadlift" && ex.stance === "romanian") return "posterior_chain";
  return "unclassified";
}

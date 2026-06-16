import type {
  ConjugateBar,
  ConjugateEquipment,
  ConjugateExercise,
  MovementCategory,
  PrimaryLift,
} from "../types/conjugate";

type ExerciseShape = Pick<ConjugateExercise, "type" | "bar" | "stance" | "equipment">;

const LOCKOUT_EQUIPMENT = new Set<ConjugateEquipment>(["board", "floor", "blocks", "rack"]);
const BOTTOM_RANGE_EQUIPMENT = new Set<ConjugateEquipment>(["deficit", "pause"]);
const QUAD_DOMINANT_BARS = new Set<ConjugateBar>(["ssb", "goblet", "trap"]);

type BaselineEntry = {
  min: number;
  max: number;
  equipmentOverrides?: Partial<Record<ConjugateEquipment, { min: number; max: number }>>;
};

export const BIOMECHANICAL_BASELINES: Record<PrimaryLift, Partial<Record<MovementCategory, BaselineEntry>>> = {
  bench: {
    lockout: { min: 90, max: 95, equipmentOverrides: { floor: { min: 85, max: 90 } } },
    bottom_range: { min: 90, max: 95 },
  },
  squat: {
    bottom_range: { min: 85, max: 92 },
    quad_dominant: { min: 80, max: 85 },
  },
  deadlift: {
    bottom_range: { min: 85, max: 90 },
    lockout: { min: 90, max: 95 },
  },
};

export const ACCOMMODATING_RESISTANCE_BASELINES: Record<string, { range: string; floor: number }> = {};

export function toMovementCategory(ex: ExerciseShape): MovementCategory {
  if (ex.type === "accessory") return "unclassified";
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

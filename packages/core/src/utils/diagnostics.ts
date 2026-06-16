import type {
  ConjugateBar,
  ConjugateDataPair,
  ConjugateEquipment,
  ConjugateExercise,
  DiagnosticResult,
  MovementCategory,
  PrimaryLift,
  TrainingSession,
} from "../types/conjugate";
import { fitVariantFactor } from "./e1rm";

type ExerciseShape = Pick<ConjugateExercise, "type" | "bar" | "stance" | "equipment">;

const LOCKOUT_EQUIPMENT = new Set<ConjugateEquipment>(["board", "floor", "blocks", "rack"]);
const BOTTOM_RANGE_EQUIPMENT = new Set<ConjugateEquipment>(["deficit", "pause"]);
const QUAD_DOMINANT_BARS = new Set<ConjugateBar>(["ssb", "goblet", "trap"]);

type BaselineEntry = {
  min: number;
  max: number;
  equipmentOverrides?: Partial<Record<ConjugateEquipment, { min: number; max: number }>>;
};

export const BIOMECHANICAL_BASELINES: Record<
  PrimaryLift,
  Partial<Record<MovementCategory, BaselineEntry>>
> = {
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

export const ACCOMMODATING_RESISTANCE_BASELINES: Record<string, { range: string; floor: number }> =
  {};

export function generateDiagnostics(pairs: ConjugateDataPair[]): DiagnosticResult[] {
  const byLift = new Map<PrimaryLift, ConjugateDataPair[]>();
  for (const pair of pairs) {
    const [ex] = pair;
    if (ex.type === "accessory") continue;
    const lift = ex.type as PrimaryLift;
    if (!byLift.has(lift)) byLift.set(lift, []);
    byLift.get(lift)!.push(pair);
  }

  const results: DiagnosticResult[] = [];

  for (const [lift, liftPairs] of byLift) {
    const anchorSessions: TrainingSession[] = [];
    const variationGroups = new Map<
      string,
      { ex: ConjugateExercise; sessions: TrainingSession[] }
    >();

    for (const [ex, session] of liftPairs) {
      if (ex.movementCategory === "anchor") {
        anchorSessions.push(session);
      } else if (ex.movementCategory !== "unclassified") {
        const key = ex.displayName;
        if (!variationGroups.has(key)) variationGroups.set(key, { ex, sessions: [] });
        variationGroups.get(key)!.sessions.push(session);
      }
    }

    for (const [name, { ex, sessions }] of variationGroups) {
      const { factor, sampleCount } = fitVariantFactor(anchorSessions, sessions);
      if (sampleCount === 0) continue;

      const averageIndex = factor * 100;

      let baseline: { min: number; max: number } | null = null;
      let expectedBaseline: string;
      const arEntry = ACCOMMODATING_RESISTANCE_BASELINES[name];
      if (arEntry) {
        baseline = { min: arEntry.floor, max: arEntry.floor };
        expectedBaseline = arEntry.range;
      } else {
        const catEntry = BIOMECHANICAL_BASELINES[lift][ex.movementCategory];
        if (catEntry) {
          const override = ex.equipment ? catEntry.equipmentOverrides?.[ex.equipment] : undefined;
          baseline = override ?? { min: catEntry.min, max: catEntry.max };
        }
        if (!baseline) continue;
        expectedBaseline = `${baseline.min}–${baseline.max}%`;
      }

      const tag = averageIndex >= baseline.min ? "Optimal" : "Weakness";
      results.push({
        primaryLift: lift,
        name,
        category: ex.movementCategory,
        averageIndex,
        expectedBaseline,
        diagnostic: `${tag}: ${name} at ${Math.round(averageIndex)}%`,
      });
    }
  }

  return results;
}

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

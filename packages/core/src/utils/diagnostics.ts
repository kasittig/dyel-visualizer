import type {
  ConjugateBar,
  ConjugateDataPair,
  ConjugateEquipment,
  ConjugateExercise,
  DeadliftStancePreference,
  DiagnosticResult,
  EffectEnum,
  MovementCategory,
  PrimaryLift,
  TrainingSession,
} from "../types/conjugate";
import { fitVariantFactor } from "./e1rm";

type ExerciseShape = Pick<ConjugateExercise, "type" | "bar" | "stance" | "equipment">;

const LOCKOUT_EQUIPMENT = new Set<ConjugateEquipment>(["board", "floor", "blocks", "rack"]);
const BOTTOM_RANGE_EQUIPMENT = new Set<ConjugateEquipment>(["deficit", "pause"]);
const QUAD_DOMINANT_BARS = new Set<ConjugateBar>(["ssb", "goblet", "trap", "zercher", "belt"]);

export const EFFECT_DESCRIPTIONS: Record<EffectEnum, string> = {
  QUAD_DOMINANT: "shifts primary emphasis to the quadriceps",
  POSTERIOR_CHAIN: "shifts primary emphasis to glutes/hamstrings/lower back as a unit",
  HAMSTRING_DOMINANT: "specifically targets the hamstrings within the posterior chain",
  HIP_DOMINANT: "emphasizes hip hinge mechanics and hip abductors/adductors",
  TRICEP_DOMINANT: "shifts pressing emphasis to the triceps",
  UPPER_PECS: "shifts pressing emphasis to the upper pectorals and anterior deltoids",
  LOWER_PECS: "shifts pressing emphasis to the lower pectorals",
  LOCKOUT: "trains the top portion of the lift; develops strength near full extension",
  BOTTOM_RANGE:
    "trains the bottom portion of the lift; develops strength out of the hole or off the floor",
  DEAD_STOP: "removes the stretch-shortening reflex; requires generating force from a static start",
  REDUCED_ROM: "shortens the range of motion relative to competition lift",
  EXTENDED_ROM: "lengthens the range of motion relative to competition lift",
  ACCOMMODATING_RESISTANCE:
    "resistance increases as the bar rises; rewards bar speed and trains the full ROM",
  SUPRAMAXIMAL:
    "allows loading above the lifter's true max; develops confidence and strength at specific positions",
  STABILIZER_DEMAND: "requires greater activation of stabilizer muscles to control the bar",
  UPPER_BACK_DEMAND: "increases demand on lats and upper back to maintain position",
  CORE_DEMAND: "increases demand on the core to maintain position and transfer force",
  SHOULDER_FRIENDLY: "reduces stress on the shoulder joint relative to a straight bar",
  SPINE_DELOAD: "reduces axial spinal compression; spares the lower back",
  UNILATERAL: "loads one limb at a time; exposes and addresses side-to-side imbalances",
  BAR_SPEED: "rewards or requires explosive bar speed to complete the lift",
  POSTERIOR_SHIFT:
    "promotes shifting weight posteriorly; encourages sitting back rather than forward",
  NO_LEG_DRIVE: "eliminates the ability to use leg drive; isolates upper body pressing musculature",
  UPRIGHT_TORSO: "forces or encourages a more vertical torso angle than the competition lift",
};

type ModifierEffectEntry =
  | { effects: EffectEnum[]; min: number; max: number }
  | { effects: EffectEnum[] };

// When multiple pct-bearing modifiers are simultaneously active (e.g. SSB + pause squat),
// their ranges are combined multiplicatively: each modifier independently scales performance
// relative to the competition lift, so the effects compound. Start at 100% and multiply by
// each modifier's min and max in turn:
//   combined_min = round(m1_min × m2_min / 100)  (applied iteratively)
// addl_wt entries (chains, bands) carry no pct and are never included in the combination.
export const MODIFIER_EFFECTS: Record<string, ModifierEffectEntry> = {
  // bar × lift
  "bar:standard:squat": { effects: [], min: 100, max: 100 },
  "bar:standard:bench": { effects: [], min: 100, max: 100 },
  "bar:standard:deadlift": { effects: [], min: 100, max: 100 },
  "bar:ssb:squat": {
    effects: ["QUAD_DOMINANT", "UPPER_BACK_DEMAND", "SHOULDER_FRIENDLY", "UPRIGHT_TORSO"],
    min: 90,
    max: 95,
  },
  "bar:trap:deadlift": {
    effects: ["QUAD_DOMINANT", "UPRIGHT_TORSO", "SPINE_DELOAD"],
    min: 105,
    max: 115,
  },
  "bar:american:bench": { effects: ["SHOULDER_FRIENDLY"], min: 95, max: 100 },
  "bar:swiss:bench": { effects: ["SHOULDER_FRIENDLY"], min: 90, max: 100 },
  "bar:cambered:squat": {
    effects: ["STABILIZER_DEMAND", "UPPER_BACK_DEMAND", "BOTTOM_RANGE"],
    min: 85,
    max: 95,
  },
  "bar:zercher:squat": {
    effects: ["CORE_DEMAND", "UPPER_BACK_DEMAND", "UPRIGHT_TORSO"],
    min: 70,
    max: 85,
  },
  "bar:duffalo:bench": { effects: ["SHOULDER_FRIENDLY"], min: 95, max: 100 },
  "bar:dumbbell:bench": { effects: ["UNILATERAL", "STABILIZER_DEMAND"], min: 75, max: 90 },
  "bar:bamboo:bench": { effects: ["STABILIZER_DEMAND", "BAR_SPEED"], min: 80, max: 90 },
  "bar:belt:squat": { effects: ["SPINE_DELOAD", "QUAD_DOMINANT"], min: 85, max: 95 },
  "bar:goblet:squat": {
    effects: ["QUAD_DOMINANT", "UPRIGHT_TORSO", "CORE_DEMAND"],
    min: 50,
    max: 65,
  },

  // stance × lift
  "stance:competition:squat": { effects: [], min: 100, max: 100 },
  "stance:competition:bench": { effects: [], min: 100, max: 100 },
  "stance:competition:deadlift": { effects: [], min: 100, max: 100 },
  "stance:sumo:deadlift": {
    effects: ["HIP_DOMINANT", "POSTERIOR_CHAIN", "REDUCED_ROM"],
    min: 90,
    max: 100,
  },
  "stance:sumo:squat": { effects: ["HIP_DOMINANT", "POSTERIOR_CHAIN"], min: 90, max: 100 },
  "stance:conventional:deadlift": {
    effects: ["HAMSTRING_DOMINANT", "POSTERIOR_CHAIN"],
    min: 90,
    max: 100,
  },
  "stance:close:bench": { effects: ["TRICEP_DOMINANT"], min: 80, max: 90 },
  "stance:close:squat": { effects: ["QUAD_DOMINANT"], min: 85, max: 95 },
  "stance:wide:bench": { effects: ["UPPER_PECS", "REDUCED_ROM"], min: 90, max: 100 },
  "stance:wide:squat": { effects: ["POSTERIOR_CHAIN"], min: 90, max: 100 },
  "stance:medium:bench": { effects: [], min: 100, max: 100 },
  "stance:medium:squat": { effects: [], min: 100, max: 100 },
  "stance:narrow:bench": { effects: ["TRICEP_DOMINANT"], min: 85, max: 95 },
  "stance:narrow:squat": { effects: ["QUAD_DOMINANT"], min: 85, max: 95 },
  "stance:romanian:deadlift": { effects: ["HAMSTRING_DOMINANT", "BOTTOM_RANGE"], min: 60, max: 75 },
  "stance:front:squat": {
    effects: ["QUAD_DOMINANT", "UPRIGHT_TORSO", "CORE_DEMAND"],
    min: 75,
    max: 85,
  },
  "stance:slingshot:bench": { effects: ["SUPRAMAXIMAL", "LOCKOUT"], min: 110, max: 120 },
  "stance:builder:bench": { effects: ["BOTTOM_RANGE", "SUPRAMAXIMAL"], min: 105, max: 115 },
  "stance:opposite:deadlift": { effects: [], min: 100, max: 100 },

  // equipment × lift
  "equipment:incline:bench": { effects: ["UPPER_PECS"], min: 85, max: 95 },
  "equipment:decline:bench": { effects: ["LOWER_PECS"], min: 100, max: 110 },
  "equipment:blocks:deadlift": { effects: ["REDUCED_ROM", "LOCKOUT"], min: 105, max: 115 },
  "equipment:deficit:deadlift": { effects: ["EXTENDED_ROM", "BOTTOM_RANGE"], min: 85, max: 95 },
  "equipment:board:bench": {
    effects: ["REDUCED_ROM", "LOCKOUT", "SUPRAMAXIMAL"],
    min: 105,
    max: 115,
  },
  "equipment:pause:squat": { effects: ["DEAD_STOP"], min: 85, max: 95 },
  "equipment:pause:bench": { effects: ["DEAD_STOP"], min: 85, max: 95 },
  "equipment:pause:deadlift": { effects: ["DEAD_STOP"], min: 90, max: 95 },
  "equipment:floor:bench": {
    effects: ["REDUCED_ROM", "LOCKOUT", "NO_LEG_DRIVE", "TRICEP_DOMINANT"],
    min: 85,
    max: 95,
  },
  "equipment:box:squat": { effects: ["DEAD_STOP", "POSTERIOR_SHIFT"], min: 90, max: 100 },
  "equipment:rack:deadlift": { effects: ["REDUCED_ROM", "LOCKOUT"], min: 110, max: 130 },

  // addl_wt × lift (no pct — accommodating resistance has no percentage baselines)
  "addl_wt:chains:squat": {
    effects: ["ACCOMMODATING_RESISTANCE", "BAR_SPEED", "STABILIZER_DEMAND"],
  },
  "addl_wt:chains:bench": {
    effects: ["ACCOMMODATING_RESISTANCE", "BAR_SPEED", "STABILIZER_DEMAND"],
  },
  "addl_wt:chains:deadlift": {
    effects: ["ACCOMMODATING_RESISTANCE", "BAR_SPEED", "STABILIZER_DEMAND"],
  },
  "addl_wt:bands:squat": { effects: ["ACCOMMODATING_RESISTANCE", "BAR_SPEED"] },
  "addl_wt:bands:bench": { effects: ["ACCOMMODATING_RESISTANCE", "BAR_SPEED"] },
  "addl_wt:bands:deadlift": { effects: ["ACCOMMODATING_RESISTANCE", "BAR_SPEED"] },
  "addl_wt:rev. bands:squat": { effects: ["SUPRAMAXIMAL", "LOCKOUT"] },
  "addl_wt:rev. bands:bench": { effects: ["SUPRAMAXIMAL", "LOCKOUT"] },
  "addl_wt:rev. bands:deadlift": { effects: ["SUPRAMAXIMAL", "LOCKOUT"] },
};

export type DiagnosticsOptions = { deadliftStance?: DeadliftStancePreference };

function resolveCategory(ex: ConjugateExercise, options?: DiagnosticsOptions): MovementCategory {
  if (
    ex.type === "deadlift" &&
    (ex.stance === "sumo" || ex.stance === "conventional" || ex.stance === "opposite")
  ) {
    return toMovementCategory(ex, options);
  }
  return ex.movementCategory;
}

export function generateDiagnostics(
  pairs: ConjugateDataPair[],
  options?: DiagnosticsOptions
): DiagnosticResult[] {
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
      const effectiveCategory = resolveCategory(ex, options);
      if (effectiveCategory === "anchor") {
        anchorSessions.push(session);
      } else if (effectiveCategory !== "unclassified") {
        const key = ex.displayName;
        if (!variationGroups.has(key)) variationGroups.set(key, { ex, sessions: [] });
        variationGroups.get(key)!.sessions.push(session);
      }
    }

    for (const [name, { ex, sessions }] of variationGroups) {
      const effectiveCategory = resolveCategory(ex, options);
      const { factor, sampleCount } = fitVariantFactor(anchorSessions, sessions);
      if (sampleCount === 0) continue;

      // Collect pct-bearing keys for all active modifiers. Multiple simultaneous
      // pct modifiers (e.g. SSB + pause squat) combine multiplicatively because
      // each independently scales performance relative to the competition lift.
      const resolvedStanceKey: string | null = (() => {
        if (
          ex.type === "deadlift" &&
          (ex.stance === null ||
            ex.stance === "sumo" ||
            ex.stance === "conventional" ||
            ex.stance === "opposite")
        ) {
          const resolvedStance = effectiveCategory === "posterior_chain" ? "sumo" : "conventional";
          return `stance:${resolvedStance}:deadlift`;
        }
        if (ex.stance !== null && ex.stance !== "competition") {
          return `stance:${ex.stance}:${ex.type}`;
        }
        return null;
      })();

      const candidateKeys = [
        ex.equipment !== null ? `equipment:${ex.equipment}:${ex.type}` : null,
        resolvedStanceKey,
        ex.bar !== null && ex.bar !== "standard" ? `bar:${ex.bar}:${ex.type}` : null,
      ].filter((k): k is string => k !== null);

      type PctEntry = Extract<ModifierEffectEntry, { min: number }>;
      const pctEntries = candidateKeys
        .map((k) => MODIFIER_EFFECTS[k])
        .filter((e): e is PctEntry => e !== undefined && "min" in e);

      if (pctEntries.length === 0) continue;

      const baseline = pctEntries.reduce(
        (acc, e) => ({
          min: Math.round((acc.min * e.min) / 100),
          max: Math.round((acc.max * e.max) / 100),
        }),
        { min: 100, max: 100 }
      );
      const expectedBaseline = `${baseline.min}–${baseline.max}%`;
      const averageIndex = factor * 100;

      // Aggregate effects from all active modifiers (bar + resolved stance + equipment + addlWts).
      const stanceForEffects: string | null =
        ex.type === "deadlift" && (ex.stance === null || ex.stance === "opposite")
          ? effectiveCategory === "posterior_chain"
            ? "sumo"
            : "conventional"
          : ex.stance;

      const allEffects = new Set<EffectEnum>();
      const effectKeys: Array<string | null> = [
        ex.bar !== null && ex.bar !== "standard" ? `bar:${ex.bar}:${ex.type}` : null,
        stanceForEffects !== null && stanceForEffects !== "competition"
          ? `stance:${stanceForEffects}:${ex.type}`
          : null,
        ex.equipment !== null ? `equipment:${ex.equipment}:${ex.type}` : null,
        ...ex.addlWts.map((w) => `addl_wt:${w}:${ex.type}`),
      ];
      for (const k of effectKeys) {
        if (k !== null) MODIFIER_EFFECTS[k]?.effects.forEach((e) => allEffects.add(e));
      }

      const status =
        averageIndex < baseline.min
          ? "weakness"
          : averageIndex > baseline.max
            ? "overtrained"
            : "optimal";
      results.push({
        primaryLift: lift,
        name,
        category: effectiveCategory,
        averageIndex,
        expectedBaseline,
        status,
        diagnostic: `${name} at ${Math.round(averageIndex)}%`,
        effects: [...allEffects],
      });
    }
  }

  return results;
}

export function toMovementCategory(
  ex: ExerciseShape,
  options?: DiagnosticsOptions
): MovementCategory {
  if (ex.type === "accessory") return "unclassified";
  // Variation-specific checks run before the competition-stance anchor check so that exercises
  // with a default "competition" stance (the parser fallback) are still classified by their
  // equipment or other modifiers rather than being swept into anchorSessions.
  if ((ex.equipment !== null && LOCKOUT_EQUIPMENT.has(ex.equipment)) || ex.stance === "close")
    return "lockout";
  if (ex.equipment !== null && BOTTOM_RANGE_EQUIPMENT.has(ex.equipment)) return "bottom_range";
  if (ex.type === "squat" && ex.bar === "cambered") return "bottom_range";
  if (ex.type === "squat" && (ex.stance === "sumo" || ex.stance === "wide"))
    return "posterior_chain";
  if (
    ex.type === "squat" &&
    ((ex.bar !== null && QUAD_DOMINANT_BARS.has(ex.bar)) || ex.stance === "front")
  )
    return "quad_dominant";
  if (ex.type === "deadlift" && ex.stance === "romanian") return "posterior_chain";
  if (ex.type === "squat" && ex.equipment === "box") return "bottom_range";
  if (ex.stance === "slingshot" || ex.stance === "builder") return "lockout";
  if (ex.stance === "narrow") return "lockout";
  if (ex.type === "bench" && (ex.equipment === "incline" || ex.equipment === "decline"))
    return "lockout";
  if (ex.stance === "competition") return "anchor";
  if (
    ex.type === "deadlift" &&
    (ex.stance === null ||
      ex.stance === "sumo" ||
      ex.stance === "conventional" ||
      ex.stance === "opposite")
  ) {
    const primary = options?.deadliftStance ?? "conventional";
    const nonPrimary = primary === "conventional" ? "sumo" : "conventional";
    // Resolve to the actual stance: "opposite" = the non-primary stance; null = the primary stance.
    const actualStance: "sumo" | "conventional" =
      ex.stance === "opposite" ? nonPrimary : ex.stance === null ? primary : ex.stance;
    // sumo = posterior chain (hip abductor/glute dominant)
    // conventional = quad dominant (leg drive, more knee extension at the start)
    return actualStance === "sumo" ? "posterior_chain" : "quad_dominant";
  }
  return "unclassified";
}

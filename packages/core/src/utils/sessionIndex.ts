import { familyKey, variantLabel } from "../types/conjugate";
import type { ConjugateDataPair, TrainingSession } from "../types/conjugate";
import { fitAddlWtOffset, fitVariantFactor, predictE1RM } from "./e1rm";
import type { RepCalcStats } from "./repCalculator";

export type SessionStats = RepCalcStats & {
  lastPerformed: Map<string, Date>;
  lastSessionE1RM: Map<string, number>;
  lastSessionBestSet: Map<string, { weight: number; reps: number; sets: number }>;
  projectedE1RM: Map<string, number>;
};

type LastData = { date: Date; e1rm: number; weight: number; reps: number; sets: number };
type ExData = {
  sessions: TrainingSession[];
  label: string;
  type: string;
  isAddlWt: boolean;
  family: string;
};

export function buildSessionStats(
  pairs: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  today: Date
): SessionStats {
  const lastByName = new Map<string, LastData>();
  const dataByName = new Map<string, ExData>();
  const straightByFamily = new Map<string, TrainingSession[]>();

  for (const [exercise, session] of pairs) {
    const name = exercise.displayName;
    const fk = familyKey(exercise);

    const last = lastByName.get(name);
    if (
      !last ||
      session.date > last.date ||
      (session.date.getTime() === last.date.getTime() && session.e1rm > last.e1rm)
    ) {
      lastByName.set(name, {
        date: session.date,
        e1rm: session.e1rm,
        weight: session.weight,
        reps: session.reps,
        sets: session.sets,
      });
    }

    let data = dataByName.get(name);
    if (!data) {
      data = {
        sessions: [],
        label: variantLabel(exercise),
        type: exercise.type,
        isAddlWt: exercise.addlWts.length > 0,
        family: fk,
      };
      dataByName.set(name, data);
    }
    data.sessions.push(session);

    if (exercise.addlWts.length === 0) {
      const arr = straightByFamily.get(fk);
      if (arr) arr.push(session);
      else straightByFamily.set(fk, [session]);
    }
  }

  const addlWtOffset = new Map<string, { offset: number; sampleCount: number }>();
  for (const [name, data] of dataByName) {
    if (!data.isAddlWt) continue;
    addlWtOffset.set(name, fitAddlWtOffset(straightByFamily.get(data.family) ?? [], data.sessions));
  }

  const variantFactor = new Map<
    string,
    { factor: number; sampleCount: number; label: string; baselineName: string }
  >();
  for (const [name, data] of dataByName) {
    if (data.type === "accessory") continue;
    const baselineName = baselineNames[data.type];
    if (name === baselineName) continue;

    const baselineSessions = baselineName ? (dataByName.get(baselineName)?.sessions ?? []) : [];
    const offsetEntry = addlWtOffset.get(name);
    const adjustedSessions =
      offsetEntry && offsetEntry.sampleCount > 0
        ? data.sessions.map((s) => ({ ...s, weight: s.weight + offsetEntry.offset }))
        : data.sessions;

    const { factor, sampleCount } = fitVariantFactor(baselineSessions, adjustedSessions);
    variantFactor.set(name, {
      factor,
      sampleCount,
      label: data.label,
      baselineName: baselineName ?? "baseline",
    });
  }

  const projectedE1RM = new Map<string, number>();
  for (const [name, data] of dataByName) {
    const projected = predictE1RM(data.sessions, today);
    if (projected !== null) projectedE1RM.set(name, projected);
  }

  const lastPerformed = new Map<string, Date>();
  const lastSessionE1RM = new Map<string, number>();
  const lastSessionBestSet = new Map<string, { weight: number; reps: number; sets: number }>();
  for (const [name, last] of lastByName) {
    lastPerformed.set(name, last.date);
    lastSessionE1RM.set(name, last.e1rm);
    lastSessionBestSet.set(name, {
      weight: last.weight,
      reps: Math.round(last.reps),
      sets: last.sets,
    });
  }

  return {
    lastPerformed,
    lastSessionE1RM,
    lastSessionBestSet,
    addlWtOffset,
    variantFactor,
    projectedE1RM,
  };
}

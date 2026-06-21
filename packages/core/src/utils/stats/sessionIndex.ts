import { familyKey, variantLabel } from '../../types/conjugate';
import type { ConjugateDataPair, TrainingSession } from '../../types/conjugate';
import { fitAddlWtOffset, fitVariantFactor, predictE1RM } from '../math/e1rm';
import type { RepCalcStats } from '../math/repCalculator';

export interface LastSession {
  date: Date;
  e1rm: number;
  bestSet: { weight: number; reps: number; sets: number };
}

export interface SessionStats extends RepCalcStats {
  lastSession: Map<string, LastSession>;
  projectedE1RM: Map<string, number>;
}

interface ExData {
  sessions: TrainingSession[];
  label: string;
  type: string;
  isAddlWt: boolean;
  family: string;
}

export function buildSessionStats(
  pairs: ConjugateDataPair[],
  baselineNames: Partial<Record<string, string>>,
  today: Date
): SessionStats {
  const lastSession = new Map<string, LastSession>();
  const dataByName = new Map<string, ExData>();
  const straightByFamily = new Map<string, TrainingSession[]>();

  pairs = pairs.filter((pair) => pair[0].type != 'accessory');
  for (const [exercise, session] of pairs) {
    const name = exercise.displayName;
    const fk = familyKey(exercise);

    const prev = lastSession.get(name);
    if (
      !prev ||
      session.date > prev.date ||
      (session.date.getTime() === prev.date.getTime() && session.e1rm > prev.e1rm)
    ) {
      lastSession.set(name, {
        date: session.date,
        e1rm: session.e1rm,
        bestSet: { weight: session.weight, reps: Math.round(session.reps), sets: session.sets },
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
      if (arr) {
        arr.push(session);
      } else {
        straightByFamily.set(fk, [session]);
      }
    }
  }

  const addlWtOffset = new Map<string, { offset: number; sampleCount: number }>();
  const projectedE1RM = new Map<string, number>();
  for (const [name, data] of dataByName) {
    if (data.isAddlWt) {
      addlWtOffset.set(
        name,
        fitAddlWtOffset(straightByFamily.get(data.family) ?? [], data.sessions)
      );
    }
    const projected = predictE1RM(data.sessions, today);
    if (projected !== null) {
      projectedE1RM.set(name, projected);
    }
  }

  const variantFactor = new Map<
    string,
    { factor: number; sampleCount: number; label: string; baselineName: string }
  >();
  for (const [name, data] of dataByName) {
    const baselineName = baselineNames[data.type];
    if (name === baselineName) {
      continue;
    }

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
      baselineName: baselineName ?? 'baseline',
    });
  }

  return {
    lastSession,
    addlWtOffset,
    variantFactor,
    projectedE1RM,
  };
}

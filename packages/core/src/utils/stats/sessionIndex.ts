import { familyKey, variantLabel } from '../../types/conjugate';
import type { ConjugateDataPair, TrainingSession } from '../../types/conjugate';
import { fitAddlWtOffset, fitVariantFactor, predictE1RM } from '../math/e1rm';
import type { RepCalcStats } from '../math/repCalculator';

export interface LastSession {
  date: Date;
  e1rm: number;
  bestSet: TrainingSession;
}

export interface SessionStats extends RepCalcStats {
  lastSession: Map<string, TrainingSession>;
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
  const lastSession = new Map<string, TrainingSession>();
  const dataByName = new Map<string, ExData>();
  const straightByFamily = new Map<string, TrainingSession[]>();

  for (const [exercise, session] of pairs) {
    const name = exercise.displayName;
    const fk = familyKey(exercise);

    // Track latest session (or better e1rm if identical date)
    const prev = lastSession.get(name);
    const isNewer = !prev || session.date > prev.date;
    const isSameTimeBetterMax =
      prev && session.date.getTime() === prev.date.getTime() && session.e1rm > prev.e1rm;

    if (isNewer || isSameTimeBetterMax) {
      lastSession.set(name, session);
    }

    // Build unique data metrics map
    if (!dataByName.has(name)) {
      dataByName.set(name, {
        sessions: [],
        label: variantLabel(exercise),
        type: exercise.type,
        isAddlWt: exercise.addlWts.length > 0,
        family: fk,
      });
    }
    dataByName.get(name)!.sessions.push(session);

    // Track family sessions without additional weight
    if (exercise.addlWts.length === 0) {
      if (!straightByFamily.has(fk)) {
        straightByFamily.set(fk, []);
      }
      straightByFamily.get(fk)!.push(session);
    }
  }

  const addlWtOffset = new Map<string, { offset: number; sampleCount: number }>();
  const projectedE1RM = new Map<string, number>();
  const variantFactor = new Map<
    string,
    { factor: number; sampleCount: number; label: string; baselineName: string }
  >();

  // 2. Calculations Pass (Combined the two separate loops over dataByName into one)
  for (const [name, data] of dataByName) {
    // A. Handle Offset Adjustments
    if (data.isAddlWt) {
      const familySessions = straightByFamily.get(data.family) ?? [];
      addlWtOffset.set(name, fitAddlWtOffset(familySessions, data.sessions));
    }

    // B. Project e1RM Maxes
    const projected = predictE1RM(data.sessions, today);
    if (projected !== null) {
      projectedE1RM.set(name, projected);
    }

    // C. Evaluate Variant Deviation Factors
    const baselineName = baselineNames[data.type];
    if (name === baselineName) {
      continue;
    } // Skip identical baselines

    const offsetEntry = addlWtOffset.get(name);
    const hasValidOffset = offsetEntry && offsetEntry.sampleCount > 0;

    // Shift weight calculations only if we have sampled offset calculations
    const adjustedSessions = hasValidOffset
      ? data.sessions.map((s) => ({ ...s, weight: s.weight + offsetEntry.offset }))
      : data.sessions;

    const baselineSessions = baselineName ? (dataByName.get(baselineName)?.sessions ?? []) : [];
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

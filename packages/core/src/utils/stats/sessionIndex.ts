import { familyKey, variantLabel } from '../../types/conjugate';
import type { ConjugateDataPair, TrainingSession } from '../../types/conjugate';
import {
  applyAddlWtOffset,
  calcE1RM,
  fitVariantFactor,
  fitVariantVelocity,
  predictE1RM,
} from '../math/e1rm';
import type { RepCalcStats } from './repCalculator';

export interface LastSession {
  date: Date;
  e1rm: number;
  bestSet: TrainingSession;
}

export interface SessionStats extends RepCalcStats {
  lastSession: Map<string, TrainingSession>;
  projectedE1RM: Map<string, number>;
}

export function buildStraightByFamily(pairs: ConjugateDataPair[]): Map<string, TrainingSession[]> {
  const map = new Map<string, TrainingSession[]>();
  for (const [ex, session] of pairs) {
    if (ex.addlWts.length === 0 && ex.type !== 'accessory') {
      const fk = familyKey(ex);
      if (!map.has(fk)) {
        map.set(fk, []);
      }
      map.get(fk)!.push(session);
    }
  }
  return map;
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
  const straightByFamily = buildStraightByFamily(pairs);

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
    let adjustedSessions = data.sessions;
    if (data.isAddlWt) {
      const familySessions = straightByFamily.get(data.family) ?? [];
      const { sessions, offset, sampleCount } = applyAddlWtOffset(familySessions, data.sessions);
      addlWtOffset.set(name, { offset, sampleCount });
      adjustedSessions = sessions;
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

    const baselineSessions = baselineName ? (dataByName.get(baselineName)?.sessions ?? []) : [];
    const { factor, sampleCount } = fitVariantFactor(baselineSessions, adjustedSessions);

    variantFactor.set(name, {
      factor,
      sampleCount,
      label: data.label,
      baselineName: baselineName ?? 'baseline',
    });
  }

  // Pass 4: Enrich each baseline's projectedE1RM via velocity aggregation from variants.
  // For each qualifying variant, compute its trend (e1rm/ms) on chain-stripped data,
  // divide by its factor to get the comp-equivalent velocity, average across variants,
  // then extrapolate linearly from the most recent actual comp session.
  // This avoids cross-variant noise from mixing absolute implied comp values.
  const velocitiesByBaseline = new Map<string, number[]>();

  for (const [name, vf] of variantFactor) {
    if (vf.sampleCount < 2 || vf.factor <= 0) {
      continue;
    }
    const data = dataByName.get(name);
    if (!data) {
      continue;
    }
    const off = data.isAddlWt ? addlWtOffset.get(name) : undefined;
    const strippedSessions = data.sessions.map((s) => {
      const weight = off && off.sampleCount > 0 ? s.weight + off.offset : s.weight;
      return { ...s, e1rm: calcE1RM(weight, s.reps, s.rpe) };
    });
    const { velocityPerMs, sampleCount } = fitVariantVelocity(strippedSessions);
    if (sampleCount < 2) {
      continue;
    }
    if (!velocitiesByBaseline.has(vf.baselineName)) {
      velocitiesByBaseline.set(vf.baselineName, []);
    }
    velocitiesByBaseline.get(vf.baselineName)!.push(velocityPerMs / vf.factor);
  }

  for (const [baselineName, velocities] of velocitiesByBaseline) {
    const compData = dataByName.get(baselineName);
    if (!compData || compData.sessions.length === 0) {
      continue;
    }
    if (compData.sessions.length >= 2) {
      continue;
    }
    const lastComp = compData.sessions.reduce(
      (best, s) => (s.date > best.date ? s : best),
      compData.sessions[0]
    );
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const projected = lastComp.e1rm + avgVelocity * (today.getTime() - lastComp.date.getTime());
    if (projected > 0) {
      projectedE1RM.set(baselineName, projected);
    }
  }

  return {
    lastSession,
    addlWtOffset,
    variantFactor,
    projectedE1RM,
  };
}

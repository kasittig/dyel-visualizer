import { familyKey, variantLabel } from '../../types/conjugate';
import type { ConjugateDataPair, TrainingSession } from '../../types/conjugate';
import { applyAddlWtOffset, calcE1RM, fitVariantFactor, predictE1RM } from '../math/e1rm';
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

  // Pass 4: Enrich each baseline's projectedE1RM with back-projected variant sessions.
  // For each well-calibrated variant (sampleCount >= 2), divide each chain-stripped
  // session e1rm by the variantFactor to infer an implied comp e1rm at that date.
  // This lets Slingshot/SSB progression flow into the comp baseline projection even
  // when direct comp sessions are sparse.
  const impliedByBaseline = new Map<string, TrainingSession[]>();
  for (const [name, vf] of variantFactor) {
    if (vf.sampleCount < 2 || vf.factor <= 0) {
      continue;
    }
    const data = dataByName.get(name);
    if (!data) {
      continue;
    }
    const off = data.isAddlWt ? addlWtOffset.get(name) : undefined;
    const sessions = data.sessions.map((s) => {
      const weight = off && off.sampleCount > 0 ? s.weight + off.offset : s.weight;
      return { ...s, e1rm: calcE1RM(weight, s.reps, s.rpe) / vf.factor };
    });
    if (!impliedByBaseline.has(vf.baselineName)) {
      impliedByBaseline.set(vf.baselineName, []);
    }
    impliedByBaseline.get(vf.baselineName)!.push(...sessions);
  }

  for (const [baselineName, impliedSessions] of impliedByBaseline) {
    const compSessions = dataByName.get(baselineName)?.sessions ?? [];
    const enriched = predictE1RM([...compSessions, ...impliedSessions], today);
    if (enriched !== null) {
      projectedE1RM.set(baselineName, enriched);
    }
  }

  return {
    lastSession,
    addlWtOffset,
    variantFactor,
    projectedE1RM,
  };
}

import type { ChartPoint, ConjugateExercise } from '@dyel/core';

export interface JoinedChartPoint {
  dateKey: string;
  a?: ChartPoint;
  b?: ChartPoint;
}
export interface BaselineIdentityComparison {
  family: string;
  legacyLabel: string | null;
  pipelineLabel: string | null;
  matches: boolean;
}
export interface SeriesDiff {
  seriesName: string;
  comparedCount: number;
  missingInA: number;
  missingInB: number;
  maxAbsDiff: number;
  maxRelDiff: number;
}

function localDateKey(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function joinChartPointsByDate(a: ChartPoint[], b: ChartPoint[]): JoinedChartPoint[] {
  const byKey = new Map<string, JoinedChartPoint>();
  const add = (pts: ChartPoint[], side: 'a' | 'b') =>
    pts.forEach((p) => {
      const k = localDateKey(String(p.date));
      byKey.set(k, { ...byKey.get(k), dateKey: k, [side]: p });
    });
  add(a, 'a');
  add(b, 'b');
  return [...byKey.values()].sort((x, y) => x.dateKey.localeCompare(y.dateKey));
}

export function diffSeries(joined: JoinedChartPoint[], seriesName: string): SeriesDiff {
  let comparedCount = 0,
    missingInA = 0,
    missingInB = 0,
    maxAbsDiff = 0,
    maxRelDiff = 0;

  for (const { a, b } of joined) {
    const aVal = a?.[seriesName],
      bVal = b?.[seriesName];
    const hasA = typeof aVal === 'number',
      hasB = typeof bVal === 'number';

    if (hasA && hasB) {
      comparedCount++;
      const absDiff = Math.abs(aVal - bVal);
      const denom = Math.max(Math.abs(aVal), Math.abs(bVal));
      const relDiff = denom === 0 ? 0 : absDiff / denom;
      maxAbsDiff = Math.max(maxAbsDiff, absDiff);
      maxRelDiff = Math.max(maxRelDiff, relDiff);
    } else if (hasA) {
      missingInB++;
    } else if (hasB) {
      missingInA++;
    }
  }
  return { seriesName, comparedCount, missingInA, missingInB, maxAbsDiff, maxRelDiff };
}

function buildBaselineCanonical(ex: ConjugateExercise): string {
  const parts: string[] = [ex.type];
  if (typeof ex.bar === 'string' && ex.bar !== 'standard') {
    parts.push(ex.bar);
  }
  if (typeof ex.stance === 'string' && ex.stance !== 'competition') {
    parts.push(ex.stance);
  }
  if (typeof ex.equipment === 'string') {
    parts.push(ex.equipment);
  }

  (ex.addlWts || []).forEach((w) => {
    if (typeof w === 'string') {
      parts.push(w === 'rev. bands' ? 'rev-bands' : w);
    }
  });
  return parts.join('-');
}

export function compareBaselineIdentity(
  family: string,
  legacyEx: ConjugateExercise | undefined,
  pipelineCanonical: string | undefined,
  pref: 'sumo' | 'conventional' = 'sumo'
): BaselineIdentityComparison {
  const legacyLabel = legacyEx?.displayName ?? null,
    pipelineLabel = pipelineCanonical ?? null;
  if (!legacyEx || !pipelineCanonical) {
    return { family, legacyLabel, pipelineLabel, matches: !legacyEx && !pipelineCanonical };
  }

  if (family === 'deadlift') {
    const resolve = (st: string | null) =>
      st === 'sumo' || st === 'conventional'
        ? st
        : st === 'opposite'
          ? pref === 'sumo'
            ? 'conventional'
            : 'sumo'
          : pref;
    const pStance = pipelineCanonical.endsWith('-sumo')
      ? 'sumo'
      : pipelineCanonical.endsWith('-opposite') || pipelineCanonical.endsWith('-conventional')
        ? resolve(pipelineCanonical.split('-').pop()!)
        : pref;
    const lStance = resolve(legacyEx.stance);
    return { family, legacyLabel: lStance, pipelineLabel: pStance, matches: lStance === pStance };
  }

  return {
    family,
    legacyLabel,
    pipelineLabel,
    matches: buildBaselineCanonical(legacyEx) === pipelineCanonical,
  };
}

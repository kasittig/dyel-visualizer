import type { LiftType } from '@dyel/pipeline';
import type { LifterPipelineResult } from '../sheet/loadIndexPipelineModels';
import type { DisplayUnit } from '../weightUnit';
import { formatWeight } from '../weightUnit';
import type { Effort } from '../repCalculator/effort';
import { predictWeightForRepsAndEffort } from '../repCalculator/effort';
import {
  convertE1RMToDisplayUnit,
  formatE1RMSourceLabel,
  resolveE1RMEstimate,
  resolveFamilyRecentE1RMEstimate,
  roundTo5,
} from '../repCalculator/repCalculatorUtils';
import {
  buildLastSessionDetailForCanonical,
  buildSessionCountForCanonical,
  formatLastSessionParts,
} from '../session/lastSessionDetail';

export interface TeamViewRowSnapshot {
  hasData: boolean;
  message?: string;
  e1rmDisplay: string;
  e1rmProjectedDisplay: string | null;
  e1rmSourceLabel: string | null;
  e1rmFamilyRecentDisplay: string | null;
  e1rmFamilyRecentSourceLabel: string | null;
  lastPerformedDateDisplay: string;
  lastPerformedSetDisplay: string;
  targetWeightDisplay: string;
  targetWeightProjectedDisplay: string | null;
  sessionCount: number;
}

const unavailable = (message: string): TeamViewRowSnapshot => ({
  hasData: false,
  message,
  e1rmDisplay: '—',
  e1rmProjectedDisplay: null,
  e1rmSourceLabel: null,
  e1rmFamilyRecentDisplay: null,
  e1rmFamilyRecentSourceLabel: null,
  lastPerformedDateDisplay: '—',
  lastPerformedSetDisplay: message,
  targetWeightDisplay: '—',
  targetWeightProjectedDisplay: null,
  sessionCount: 0,
});

export function buildTeamViewRowSnapshot({
  result,
  canonical,
  liftType,
  reps,
  effort,
  unit,
  now,
}: {
  result: LifterPipelineResult;
  canonical: string | null;
  liftType: LiftType | null;
  reps: number;
  effort: Effort;
  unit: DisplayUnit;
  now: Date;
}): TeamViewRowSnapshot {
  if (result.status !== 'success') {
    return unavailable('Failed to load');
  }
  if (!canonical || !liftType) {
    return unavailable('No data logged');
  }
  const e1rmPoints = result.model.points.get('e1rm');
  const points = e1rmPoints.filter((point) => point.series === canonical);
  if (!points.length) {
    return unavailable('No data logged');
  }

  const latestPoint = points.reduce((latest, point) => (point.t > latest.t ? point : latest));
  const detail = buildLastSessionDetailForCanonical(result.model.tagged, canonical);
  const lastSessionParts = detail ? formatLastSessionParts(detail, unit) : null;
  const estimate = resolveE1RMEstimate({
    liftType,
    targetCanonical: canonical,
    baselineName: undefined,
    today: now,
    model: result.model.model,
    e1rmPoints: result.model.points.get('e1rm-max-effort'),
  });
  const familyEstimate = resolveFamilyRecentE1RMEstimate(
    liftType,
    canonical,
    e1rmPoints,
    now,
    result.model.model
  );
  const targetWeight = (e1rm: number) =>
    `${roundTo5(predictWeightForRepsAndEffort(convertE1RMToDisplayUnit(e1rm, unit), reps, effort))} ${unit}`;

  return {
    hasData: true,
    e1rmDisplay: formatWeight(latestPoint.v, unit),
    e1rmProjectedDisplay: estimate ? formatWeight(estimate.e1rm, unit) : null,
    e1rmSourceLabel: formatE1RMSourceLabel(estimate),
    e1rmFamilyRecentDisplay: familyEstimate ? formatWeight(familyEstimate.e1rm, unit) : null,
    e1rmFamilyRecentSourceLabel: formatE1RMSourceLabel(familyEstimate),
    lastPerformedDateDisplay: lastSessionParts?.date ?? '',
    lastPerformedSetDisplay: lastSessionParts?.setLine ?? '',
    targetWeightDisplay: targetWeight(latestPoint.v),
    targetWeightProjectedDisplay: estimate ? targetWeight(estimate.e1rm) : null,
    sessionCount: buildSessionCountForCanonical(result.model.tagged, canonical),
  };
}

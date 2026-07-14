import { useMemo, useState } from 'react';
import type { DisplayUnit, LifterPipelineResult } from '@dyel/api';
import {
  buildExerciseDisplayNameIndex,
  buildLastSessionDetailForCanonical,
  convertE1RMToDisplayUnit,
  detectDataUnit,
  formatLastSessionSummary,
  formatWeight,
  groupByLiftType,
  predictWeightForReps,
  roundTo5,
} from '@dyel/api';

export interface CoachViewRow {
  lifterName: string;
  e1rmDisplay: string;
  lastPerformedDisplay: string;
  targetWeightDisplay: string;
  hasData: boolean;
}

export function useCoachViewSelection(results: LifterPipelineResult[]) {
  const erroredLifterCount = results.filter((r) => r.status === 'error').length;

  const { exerciseOptions, displayNameToCanonical } = useMemo(() => {
    const canonicalSet = new Set<string>();
    for (const res of results) {
      if (res.status === 'success') {
        (res.model.pointsByDeriver.get('e1rm') ?? []).forEach((p) => canonicalSet.add(p.series));
      }
    }
    const index = buildExerciseDisplayNameIndex(Array.from(canonicalSet));
    return {
      exerciseOptions: index.map((e) => e.displayName),
      displayNameToCanonical: new Map(index.map((e) => [e.displayName, e.canonical])),
    };
  }, [results]);

  const [explicitDisplayName, setSelectedDisplayName] = useState('');
  const [reps, setReps] = useState(1);
  const [unit, setUnit] = useState<DisplayUnit>(() => {
    const firstActive = results.find((r) => r.status === 'success');
    return firstActive ? detectDataUnit(groupByLiftType(firstActive.model.tagged)) : 'lbs';
  });

  // Auto-select the first exercise option once options load, without overriding an explicit
  // user selection — derived directly rather than via a setState-in-effect (which would double
  // render), per decision to keep this a pure render-time derivation.
  const selectedDisplayName = explicitDisplayName || exerciseOptions[0] || '';

  const selectedCanonical = selectedDisplayName
    ? (displayNameToCanonical.get(selectedDisplayName) ?? null)
    : null;
  const toggleUnit = () => setUnit((prev) => (prev === 'lbs' ? 'kg' : 'lbs'));

  const rows = useMemo<CoachViewRow[]>(() => {
    if (!selectedCanonical) {
      return [];
    }

    const placeholder = (name: string, msg: string): CoachViewRow => ({
      lifterName: name,
      e1rmDisplay: '—',
      lastPerformedDisplay: msg,
      targetWeightDisplay: '—',
      hasData: false,
    });

    return results.map((res): CoachViewRow => {
      if (res.status !== 'success') {
        return placeholder(res.name, 'Failed to load');
      }

      const points = (res.model.pointsByDeriver.get('e1rm') ?? []).filter(
        (p) => p.series === selectedCanonical
      );
      if (!points.length) {
        return placeholder(res.name, 'No data logged');
      }

      const latestPoint = points.reduce((max, curr) => (curr.t > max.t ? curr : max));
      const detail = buildLastSessionDetailForCanonical(res.model.tagged, selectedCanonical);

      return {
        lifterName: res.name,
        e1rmDisplay: formatWeight(latestPoint.v, unit),
        lastPerformedDisplay: detail ? formatLastSessionSummary(detail, unit) : '',
        targetWeightDisplay: `${roundTo5(predictWeightForReps(convertE1RMToDisplayUnit(latestPoint.v, unit), reps))} ${unit}`,
        hasData: true,
      };
    });
  }, [selectedCanonical, reps, unit, results]);

  return {
    exerciseOptions,
    displayNameToCanonical,
    selectedCanonical,
    selectedDisplayName,
    setSelectedDisplayName,
    reps,
    setReps,
    unit,
    setUnit,
    toggleUnit,
    rows,
    erroredLifterCount,
  };
}

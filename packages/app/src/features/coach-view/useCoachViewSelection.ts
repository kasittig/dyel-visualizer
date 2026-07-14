import { useMemo, useState } from 'react';
import type { DisplayUnit, LifterPipelineResult } from '@dyel/api';
import {
  buildExerciseDisplayNameIndex,
  buildLastSessionDetailForCanonical,
  buildSessionCountForCanonical,
  convertE1RMToDisplayUnit,
  detectDataUnit,
  formatLastSessionSummary,
  formatWeight,
  groupByLiftType,
  predictWeightForReps,
  roundTo5,
} from '@dyel/api';

interface LifterOverride {
  displayName?: string;
  reps?: number;
}

export interface CoachViewRow {
  lifterName: string;
  e1rmDisplay: string;
  lastPerformedDisplay: string;
  targetWeightDisplay: string;
  sessionCount: number;
  hasData: boolean;
  effectiveDisplayName: string;
  effectiveReps: number;
  availableExerciseOptions: string[];
  onExerciseChange: (displayName: string) => void;
  onRepsChange: (reps: number) => void;
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

  const [overridesByLifter, setOverridesByLifter] = useState<Map<string, LifterOverride>>(
    new Map()
  );

  // Auto-select the first exercise option once options load, without overriding an explicit
  // user selection — derived directly rather than via a setState-in-effect (which would double
  // render), per decision to keep this a pure render-time derivation.
  const selectedDisplayName = explicitDisplayName || exerciseOptions[0] || '';

  const selectedCanonical = selectedDisplayName
    ? (displayNameToCanonical.get(selectedDisplayName) ?? null)
    : null;

  const setSelectedDisplayNameAndReset = (name: string) => {
    setSelectedDisplayName(name);
    setOverridesByLifter((prev) => {
      const next = new Map<string, LifterOverride>();
      for (const [k, v] of prev) {
        next.set(k, { ...v, displayName: undefined });
      }
      return next;
    });
  };

  const setRepsAndReset = (r: number) => {
    setReps(r);
    setOverridesByLifter((prev) => {
      const next = new Map<string, LifterOverride>();
      for (const [k, v] of prev) {
        next.set(k, { ...v, reps: undefined });
      }
      return next;
    });
  };

  const toggleUnit = () => setUnit((prev) => (prev === 'lbs' ? 'kg' : 'lbs'));

  const rows = useMemo<CoachViewRow[]>(() => {
    if (!selectedCanonical) {
      return [];
    }

    const placeholder = (
      name: string,
      msg: string,
      effectiveDisplayName: string,
      effectiveReps: number,
      onExerciseChange: (displayName: string) => void,
      onRepsChange: (reps: number) => void,
      availableExerciseOptions: string[]
    ): CoachViewRow => ({
      lifterName: name,
      e1rmDisplay: '—',
      lastPerformedDisplay: msg,
      targetWeightDisplay: '—',
      sessionCount: 0,
      hasData: false,
      effectiveDisplayName,
      effectiveReps,
      availableExerciseOptions,
      onExerciseChange,
      onRepsChange,
    });

    return results.map((res): CoachViewRow => {
      const override = overridesByLifter.get(res.name);
      const effectiveDisplayName = override?.displayName ?? selectedDisplayName;
      const effectiveCanonical = displayNameToCanonical.get(effectiveDisplayName) ?? null;
      const effectiveReps = override?.reps ?? reps;

      const availableExerciseOptions =
        res.status === 'success'
          ? exerciseOptions.filter((name) => {
              const canonical = displayNameToCanonical.get(name);
              return (res.model.pointsByDeriver.get('e1rm') ?? []).some(
                (p) => p.series === canonical
              );
            })
          : exerciseOptions;

      const onExerciseChange = (displayName: string) =>
        setOverridesByLifter((prev) => {
          const next = new Map(prev);
          next.set(res.name, { ...next.get(res.name), displayName });
          return next;
        });

      const onRepsChange = (r: number) =>
        setOverridesByLifter((prev) => {
          const next = new Map(prev);
          next.set(res.name, { ...next.get(res.name), reps: r });
          return next;
        });

      if (res.status !== 'success') {
        return placeholder(
          res.name,
          'Failed to load',
          effectiveDisplayName,
          effectiveReps,
          onExerciseChange,
          onRepsChange,
          availableExerciseOptions
        );
      }

      const points = (res.model.pointsByDeriver.get('e1rm') ?? []).filter(
        (p) => p.series === effectiveCanonical
      );
      if (!points.length) {
        return placeholder(
          res.name,
          'No data logged',
          effectiveDisplayName,
          effectiveReps,
          onExerciseChange,
          onRepsChange,
          availableExerciseOptions
        );
      }

      const latestPoint = points.reduce((max, curr) => (curr.t > max.t ? curr : max));
      const detail = buildLastSessionDetailForCanonical(res.model.tagged, effectiveCanonical!);
      const sessionCount = buildSessionCountForCanonical(res.model.tagged, effectiveCanonical!);

      return {
        lifterName: res.name,
        e1rmDisplay: formatWeight(latestPoint.v, unit),
        lastPerformedDisplay: detail ? formatLastSessionSummary(detail, unit) : '',
        targetWeightDisplay: `${roundTo5(predictWeightForReps(convertE1RMToDisplayUnit(latestPoint.v, unit), effectiveReps))} ${unit}`,
        sessionCount,
        hasData: true,
        effectiveDisplayName,
        effectiveReps,
        availableExerciseOptions,
        onExerciseChange,
        onRepsChange,
      };
    });
  }, [
    selectedCanonical,
    reps,
    unit,
    results,
    selectedDisplayName,
    overridesByLifter,
    displayNameToCanonical,
    exerciseOptions,
  ]);

  return {
    exerciseOptions,
    displayNameToCanonical,
    selectedCanonical,
    selectedDisplayName,
    setSelectedDisplayName: setSelectedDisplayNameAndReset,
    reps,
    setReps: setRepsAndReset,
    unit,
    setUnit,
    toggleUnit,
    rows,
    erroredLifterCount,
  };
}

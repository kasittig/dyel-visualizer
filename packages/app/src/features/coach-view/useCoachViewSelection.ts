import { useEffect, useMemo, useState } from 'react';
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
  // Count errored lifters
  const erroredLifterCount = results.filter((r) => r.status === 'error').length;

  // Build union of all canonicals across successful lifters' e1rm points,
  // then derive sorted exercise options and displayName → canonical map
  const { exerciseOptions, displayNameToCanonical } = useMemo(() => {
    const canonicalSet = new Set<string>();

    for (const result of results) {
      if (result.status === 'success') {
        const e1rmPoints = result.model.pointsByDeriver.get('e1rm') ?? [];
        for (const point of e1rmPoints) {
          canonicalSet.add(point.series);
        }
      }
    }

    const index = buildExerciseDisplayNameIndex(Array.from(canonicalSet));
    const options = index.map((entry) => entry.displayName);
    const nameToCanonical = new Map(index.map((entry) => [entry.displayName, entry.canonical]));

    return { exerciseOptions: options, displayNameToCanonical: nameToCanonical };
  }, [results]);

  // Compute initial unit from first successful lifter, or fall back to 'lbs'
  const computeInitialUnit = (): DisplayUnit => {
    for (const result of results) {
      if (result.status === 'success') {
        const tabRows = groupByLiftType(result.model.tagged);
        return detectDataUnit(tabRows);
      }
    }
    return 'lbs';
  };

  // Feature-local UI state (reps defaults to 1, unit computed once on mount)
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('');
  const [reps, setReps] = useState<number>(1);
  const [unit, setUnit] = useState<DisplayUnit>(computeInitialUnit);

  // Default to the first exercise option once data has loaded, so the table renders
  // immediately instead of requiring the coach to make a selection first.
  useEffect(() => {
    if (!selectedDisplayName && exerciseOptions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDisplayName(exerciseOptions[0]);
    }
  }, [exerciseOptions, selectedDisplayName]);

  const selectedCanonical = selectedDisplayName
    ? (displayNameToCanonical.get(selectedDisplayName) ?? null)
    : null;

  const toggleUnit = () => {
    setUnit((prev) => (prev === 'lbs' ? 'kg' : 'lbs'));
  };

  // Build rows for the selected canonical — one row per lifter (including errored/no-data
  // lifters as placeholder rows) so the coach can see the full roster at a glance.
  const rows = useMemo<CoachViewRow[]>(() => {
    if (!selectedCanonical) {
      return [];
    }

    const placeholderRow = (lifterName: string, lastPerformedDisplay: string): CoachViewRow => ({
      lifterName,
      e1rmDisplay: '—',
      lastPerformedDisplay,
      targetWeightDisplay: '—',
      hasData: false,
    });

    return results.map((result): CoachViewRow => {
      if (result.status !== 'success') {
        return placeholderRow(result.name, 'Failed to load');
      }

      const e1rmPoints = result.model.pointsByDeriver.get('e1rm') ?? [];
      const pointsForCanonical = e1rmPoints.filter((p) => p.series === selectedCanonical);

      if (pointsForCanonical.length === 0) {
        return placeholderRow(result.name, 'No data logged');
      }

      // Find max-t point (most recent)
      const maxTPoint = pointsForCanonical.reduce((max, current) =>
        current.t > max.t ? current : max
      );

      // Build e1rmDisplay
      const e1rmDisplay = formatWeight(maxTPoint.v, unit);

      // Build lastPerformedDisplay
      const detail = buildLastSessionDetailForCanonical(result.model.tagged, selectedCanonical);
      const lastPerformedDisplay = detail ? formatLastSessionSummary(detail, unit) : '';

      // Build targetWeightDisplay
      // Convert e1RM (kg) to display unit, predict weight for reps, round, format manually
      const displayE1rm = convertE1RMToDisplayUnit(maxTPoint.v, unit);
      const raw = predictWeightForReps(displayE1rm, reps);
      const rounded = roundTo5(raw);
      // Manually compose string to avoid double-conversion (already in display unit)
      const targetWeightDisplay = `${rounded} ${unit}`;

      return {
        lifterName: result.name,
        e1rmDisplay,
        lastPerformedDisplay,
        targetWeightDisplay,
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

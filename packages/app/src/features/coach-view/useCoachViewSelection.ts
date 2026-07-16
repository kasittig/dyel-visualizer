import { useMemo, useState } from 'react';
import type {
  DisplayUnit,
  LifterPipelineResult,
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
  LiftType,
} from '@dyel/api';
import {
  buildExerciseDisplayNameIndex,
  buildLastSessionDetailForCanonical,
  buildSessionCountForCanonical,
  canonicalsMatchingFacets,
  CONJUGATE_ADDL_WTS,
  CONJUGATE_BARS,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_STANCES,
  convertE1RMToDisplayUnit,
  detectDataUnit,
  formatLastSessionParts,
  formatWeight,
  groupByLiftType,
  predictWeightForReps,
  resolveE1RMEstimate,
  roundTo5,
} from '@dyel/api';
import { LIFT_TYPE_ORDER } from '../../shared/liftTypeLabels';

interface LifterOverride {
  displayName?: string;
  reps?: number;
}

export interface CoachViewRow {
  lifterName: string;
  e1rmDisplay: string;
  e1rmProjectedDisplay: string | null;
  e1rmSourceLabel: string | null;
  lastPerformedDateDisplay: string;
  lastPerformedSetDisplay: string;
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

  const { allExerciseOptions, displayNameToCanonical, liftTypeByDisplayName } = useMemo(() => {
    const canonicalSet = new Set<string>();
    for (const res of results) {
      if (res.status === 'success') {
        (res.model.pointsByDeriver.get('e1rm') ?? []).forEach((p) => canonicalSet.add(p.series));
      }
    }
    const index = buildExerciseDisplayNameIndex(Array.from(canonicalSet));
    return {
      allExerciseOptions: index.map((e) => e.displayName),
      displayNameToCanonical: new Map(index.map((e) => [e.displayName, e.canonical])),
      liftTypeByDisplayName: new Map(index.map((e) => [e.displayName, e.liftType])),
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

  const [selectedBar, setSelectedBar] = useState<ConjugateBar | null>(null);
  const [selectedStance, setSelectedStance] = useState<ConjugateStance | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<ConjugateEquipment | null>(null);
  const [selectedAddlWt, setSelectedAddlWt] = useState<ConjugateAddlWt | null>(null);
  const [selectedLiftType, setSelectedLiftType] = useState<LiftType | null>(null);

  const allTaggedRecords = useMemo(
    () => results.flatMap((r) => (r.status === 'success' ? r.model.tagged : [])),
    [results]
  );

  const anyFacetSelected = !!(selectedBar || selectedStance || selectedEquipment || selectedAddlWt);

  const facetMatchedCanonicals = useMemo(
    () =>
      canonicalsMatchingFacets(allTaggedRecords, {
        bar: selectedBar,
        stance: selectedStance,
        equipment: selectedEquipment,
        addlWt: selectedAddlWt,
      }),
    [allTaggedRecords, selectedBar, selectedStance, selectedEquipment, selectedAddlWt]
  );

  const liftTypeOptions = useMemo(() => {
    const present = new Set(liftTypeByDisplayName.values());
    return LIFT_TYPE_ORDER.filter((t) => present.has(t));
  }, [liftTypeByDisplayName]);

  // IMPORTANT: only apply the facet filter once a coach actively picks a facet. Skipping
  // filtering entirely when nothing is selected (rather than relying on
  // `canonicalsMatchingFacets` to "match everything") guarantees the dropdown's default state
  // is always identical to today's unfiltered behavior, even in edge cases where a lifter's
  // `tagged` records don't fully cover every canonical present in their e1RM points.
  const exerciseOptions = useMemo(() => {
    let opts = allExerciseOptions;
    if (selectedLiftType) {
      opts = opts.filter((name) => liftTypeByDisplayName.get(name) === selectedLiftType);
    }
    if (anyFacetSelected) {
      opts = opts.filter((name) => {
        const canonical = displayNameToCanonical.get(name);
        return !!canonical && facetMatchedCanonicals.has(canonical);
      });
    }
    return opts;
  }, [
    allExerciseOptions,
    selectedLiftType,
    liftTypeByDisplayName,
    anyFacetSelected,
    displayNameToCanonical,
    facetMatchedCanonicals,
  ]);

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

  const setSelectedBarAndReset = (v: ConjugateBar | null) => {
    setSelectedBar(v);
    setSelectedDisplayName('');
  };
  const setSelectedStanceAndReset = (v: ConjugateStance | null) => {
    setSelectedStance(v);
    setSelectedDisplayName('');
  };
  const setSelectedEquipmentAndReset = (v: ConjugateEquipment | null) => {
    setSelectedEquipment(v);
    setSelectedDisplayName('');
  };
  const setSelectedAddlWtAndReset = (v: ConjugateAddlWt | null) => {
    setSelectedAddlWt(v);
    setSelectedDisplayName('');
  };

  const setSelectedLiftTypeAndReset = (v: LiftType | null) => {
    setSelectedLiftType(v);
    setSelectedDisplayName('');
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
      e1rmProjectedDisplay: null,
      e1rmSourceLabel: null,
      lastPerformedDateDisplay: '—',
      lastPerformedSetDisplay: msg,
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

      const estimate = resolveE1RMEstimate({
        liftType: liftTypeByDisplayName.get(effectiveDisplayName)!,
        targetCanonical: effectiveCanonical!,
        baselineName: undefined,
        today: new Date(),
        model: res.model.model,
        e1rmPoints: res.model.pointsByDeriver.get('e1rm-max-effort') ?? [],
      });

      const e1rmProjectedDisplay = estimate ? formatWeight(estimate.e1rm, unit) : null;
      const e1rmSourceLabel = estimate
        ? estimate.method === 'exact'
          ? `Based on ${estimate.sourceName} · ${estimate.date.toLocaleDateString()}`
          : `Projected from ${estimate.sourceName} (${estimate.date.toLocaleDateString()})`
        : null;

      return {
        lifterName: res.name,
        e1rmDisplay: formatWeight(latestPoint.v, unit),
        e1rmProjectedDisplay,
        e1rmSourceLabel,
        lastPerformedDateDisplay: detail ? formatLastSessionParts(detail, unit).date : '',
        lastPerformedSetDisplay: detail ? formatLastSessionParts(detail, unit).setLine : '',
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
    selectedBar,
    setSelectedBar: setSelectedBarAndReset,
    selectedStance,
    setSelectedStance: setSelectedStanceAndReset,
    selectedEquipment,
    setSelectedEquipment: setSelectedEquipmentAndReset,
    selectedAddlWt,
    setSelectedAddlWt: setSelectedAddlWtAndReset,
    selectedLiftType,
    setSelectedLiftType: setSelectedLiftTypeAndReset,
    liftTypeOptions,
    barOptions: CONJUGATE_BARS,
    stanceOptions: CONJUGATE_STANCES,
    equipmentOptions: CONJUGATE_EQUIPMENT,
    addlWtOptions: CONJUGATE_ADDL_WTS,
  };
}

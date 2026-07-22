import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type {
  DisplayUnit,
  LifterPipelineResult,
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
  LiftType,
  EffortMode,
  Effort,
  Point,
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
  resolveFamilyRecentE1RMEstimate,
  formatE1RMSourceLabel,
  formatLastSessionParts,
  formatWeight,
  groupByLiftType,
  isRecordInDateRange,
  normalizeTeamHistoryPoints,
  predictWeightForRepsAndEffort,
  resolveE1RMEstimate,
  roundTo5,
  convertEffort,
} from '@dyel/api';
import { LIFT_TYPE_ORDER } from '../../shared/liftTypeLabels';

interface LifterOverride {
  displayName?: string;
  reps?: number;
  effort?: Effort;
}

export interface TeamViewRow {
  lifterName: string;
  url: string;
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
  hasData: boolean;
  effectiveDisplayName: string;
  effectiveReps: number;
  effectiveEffortMode: EffortMode;
  effectiveEffortValue: number;
  availableExerciseOptions: string[];
  onExerciseChange: (displayName: string) => void;
  onRepsChange: (reps: number) => void;
  onEffortModeChange: (mode: EffortMode) => void;
  onEffortValueChange: (value: number) => void;
  showProjected: boolean;
  onToggleProjected: () => void;
}

export function useTeamViewSelection(results: LifterPipelineResult[]) {
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
  const [effortMode, setEffortMode] = useState<EffortMode>('rpe');
  const [effortValue, setEffortValue] = useState(10);
  const [unit, setUnit] = useState<DisplayUnit>(() => {
    const firstActive = results.find((r) => r.status === 'success');
    return firstActive ? detectDataUnit(groupByLiftType(firstActive.model.tagged)) : 'lbs';
  });

  const [overridesByLifter, setOverridesByLifter] = useState<Map<string, LifterOverride>>(
    new Map()
  );

  const [showProjectedByLifter, setShowProjectedByLifter] = useState<Map<string, boolean>>(
    new Map()
  );

  const [selectedBar, setSelectedBar] = useState<ConjugateBar | null>(null);
  const [selectedStance, setSelectedStance] = useState<ConjugateStance | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<ConjugateEquipment | null>(null);
  const [selectedAddlWt, setSelectedAddlWt] = useState<ConjugateAddlWt | null>(null);
  const [selectedLiftType, setSelectedLiftType] = useState<LiftType | null>(null);

  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

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

  // IMPORTANT: only apply the facet filter once someone actively picks a facet. Skipping
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

  const setEffortModeAndReset = (mode: EffortMode) => {
    if (mode === effortMode) {
      return;
    }
    const isDefaultRpe10 = effortMode === 'rpe' && effortValue === 10;
    const isDefaultPct100 = effortMode === 'pct' && effortValue === 100;
    const converted =
      (isDefaultRpe10 && mode === 'pct') || (isDefaultPct100 && mode === 'rpe')
        ? mode === 'pct'
          ? 100
          : 10
        : convertEffort(reps, { mode: effortMode, value: effortValue }, mode);
    setEffortMode(mode);
    setEffortValue(converted);
    setOverridesByLifter((prev) => {
      const next = new Map<string, LifterOverride>();
      for (const [k, v] of prev) {
        next.set(k, { ...v, effort: undefined });
      }
      return next;
    });
  };

  const setEffortValueAndReset = (value: number) => {
    setEffortValue(value);
    setOverridesByLifter((prev) => {
      const next = new Map<string, LifterOverride>();
      for (const [k, v] of prev) {
        next.set(k, { ...v, effort: undefined });
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

  const rows = useMemo<TeamViewRow[]>(() => {
    if (!selectedCanonical) {
      return [];
    }

    const placeholder = (
      name: string,
      url: string,
      msg: string,
      shared: Pick<
        TeamViewRow,
        | 'effectiveDisplayName'
        | 'effectiveReps'
        | 'effectiveEffortMode'
        | 'effectiveEffortValue'
        | 'onExerciseChange'
        | 'onRepsChange'
        | 'onEffortModeChange'
        | 'onEffortValueChange'
        | 'availableExerciseOptions'
        | 'showProjected'
        | 'onToggleProjected'
      >
    ): TeamViewRow => ({
      lifterName: name,
      url,
      e1rmDisplay: '—',
      e1rmProjectedDisplay: null,
      e1rmSourceLabel: null,
      e1rmFamilyRecentDisplay: null,
      e1rmFamilyRecentSourceLabel: null,
      lastPerformedDateDisplay: '—',
      lastPerformedSetDisplay: msg,
      targetWeightDisplay: '—',
      targetWeightProjectedDisplay: null,
      sessionCount: 0,
      hasData: false,
      ...shared,
    });

    return results.map((res): TeamViewRow => {
      const override = overridesByLifter.get(res.name);
      const effectiveDisplayName = override?.displayName ?? selectedDisplayName;
      const effectiveCanonical = displayNameToCanonical.get(effectiveDisplayName) ?? null;
      const effectiveReps = override?.reps ?? reps;
      const effectiveEffortMode = override?.effort?.mode ?? effortMode;
      const effectiveEffortValue = override?.effort?.value ?? effortValue;

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

      const onEffortModeChange = (mode: EffortMode) =>
        setOverridesByLifter((prev) => {
          const isDefaultRpe10 = effectiveEffortMode === 'rpe' && effectiveEffortValue === 10;
          const isDefaultPct100 = effectiveEffortMode === 'pct' && effectiveEffortValue === 100;
          const converted =
            (isDefaultRpe10 && mode === 'pct') || (isDefaultPct100 && mode === 'rpe')
              ? mode === 'pct'
                ? 100
                : 10
              : convertEffort(
                  effectiveReps,
                  { mode: effectiveEffortMode, value: effectiveEffortValue },
                  mode
                );
          const next = new Map(prev);
          next.set(res.name, { ...next.get(res.name), effort: { mode, value: converted } });
          return next;
        });

      const onEffortValueChange = (value: number) =>
        setOverridesByLifter((prev) => {
          const next = new Map(prev);
          next.set(res.name, {
            ...next.get(res.name),
            effort: { mode: effectiveEffortMode, value },
          });
          return next;
        });

      const showProjected = showProjectedByLifter.get(res.name) ?? false;
      const onToggleProjected = () =>
        setShowProjectedByLifter((prev) => {
          const next = new Map(prev);
          next.set(res.name, !(prev.get(res.name) ?? false));
          return next;
        });

      const shared = {
        effectiveDisplayName,
        effectiveReps,
        effectiveEffortMode,
        effectiveEffortValue,
        onExerciseChange,
        onRepsChange,
        onEffortModeChange,
        onEffortValueChange,
        availableExerciseOptions,
        showProjected,
        onToggleProjected,
      };

      if (res.status !== 'success') {
        return placeholder(res.name, res.url, 'Failed to load', shared);
      }

      const points = (res.model.pointsByDeriver.get('e1rm') ?? []).filter(
        (p) => p.series === effectiveCanonical
      );
      if (!points.length) {
        return placeholder(res.name, res.url, 'No data logged', shared);
      }

      const latestPoint = points.reduce((max, curr) => (curr.t > max.t ? curr : max));
      const detail = buildLastSessionDetailForCanonical(res.model.tagged, effectiveCanonical!);
      const sessionCount = buildSessionCountForCanonical(res.model.tagged, effectiveCanonical!);
      const lastSessionParts = detail ? formatLastSessionParts(detail, unit) : null;

      const liftType = liftTypeByDisplayName.get(effectiveDisplayName)!;
      const estimate = resolveE1RMEstimate({
        liftType,
        targetCanonical: effectiveCanonical!,
        baselineName: undefined,
        today: new Date(),
        model: res.model.model,
        e1rmPoints: res.model.pointsByDeriver.get('e1rm-max-effort') ?? [],
      });

      const familyEstimate = resolveFamilyRecentE1RMEstimate(
        liftType,
        effectiveCanonical!,
        res.model.pointsByDeriver.get('e1rm') ?? [],
        new Date(),
        res.model.model
      );

      return {
        lifterName: res.name,
        url: res.url,
        e1rmDisplay: formatWeight(latestPoint.v, unit),
        e1rmProjectedDisplay: estimate ? formatWeight(estimate.e1rm, unit) : null,
        e1rmSourceLabel: formatE1RMSourceLabel(estimate),
        e1rmFamilyRecentDisplay: familyEstimate ? formatWeight(familyEstimate.e1rm, unit) : null,
        e1rmFamilyRecentSourceLabel: formatE1RMSourceLabel(familyEstimate),
        lastPerformedDateDisplay: lastSessionParts?.date ?? '',
        lastPerformedSetDisplay: lastSessionParts?.setLine ?? '',
        targetWeightDisplay: `${roundTo5(predictWeightForRepsAndEffort(convertE1RMToDisplayUnit(latestPoint.v, unit), effectiveReps, { mode: effectiveEffortMode, value: effectiveEffortValue }))} ${unit}`,
        targetWeightProjectedDisplay: estimate
          ? `${roundTo5(predictWeightForRepsAndEffort(convertE1RMToDisplayUnit(estimate.e1rm, unit), effectiveReps, { mode: effectiveEffortMode, value: effectiveEffortValue }))} ${unit}`
          : null,
        sessionCount,
        hasData: true,
        ...shared,
      };
    });
  }, [
    selectedCanonical,
    reps,
    effortMode,
    effortValue,
    unit,
    results,
    selectedDisplayName,
    overridesByLifter,
    showProjectedByLifter,
    displayNameToCanonical,
    exerciseOptions,
    liftTypeByDisplayName,
  ]);

  // First pass: unfiltered points (per-lifter, by effective canonical)
  const { pointsByLifterUnfiltered, normalizedPointsByLifterUnfiltered } = useMemo(() => {
    const raw = new Map<string, Point[]>();
    const normalized = new Map<string, Point[]>();
    if (selectedCanonical) {
      for (const res of results) {
        const override = overridesByLifter.get(res.name);
        const effectiveDisplayName = override?.displayName ?? selectedDisplayName;
        const effectiveCanonical = displayNameToCanonical.get(effectiveDisplayName) ?? null;
        const points =
          res.status === 'success'
            ? (res.model.pointsByDeriver.get('e1rm') ?? []).filter(
                (p) => p.series === effectiveCanonical
              )
            : [];
        raw.set(res.name, points);
        normalized.set(
          res.name,
          res.status === 'success' && effectiveCanonical
            ? normalizeTeamHistoryPoints(points, effectiveCanonical, res.model.model)
            : []
        );
      }
    }
    return { pointsByLifterUnfiltered: raw, normalizedPointsByLifterUnfiltered: normalized };
  }, [selectedCanonical, results, overridesByLifter, selectedDisplayName, displayNameToCanonical]);

  // Derive available session dates from unfiltered points
  const historySessionDates = useMemo<Date[]>(() => {
    if (!selectedCanonical) {
      return [];
    }
    const dateStrings = new Set<string>();
    for (const points of pointsByLifterUnfiltered.values()) {
      for (const p of points) {
        dateStrings.add(new Date(p.t).toDateString());
      }
    }
    return Array.from(dateStrings)
      .map((ds) => new Date(ds))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [pointsByLifterUnfiltered, selectedCanonical]);

  // Apply date range filter to produce final pointsByLifter and normalizedPointsByLifter
  const { pointsByLifter, normalizedPointsByLifter } = useMemo(() => {
    const filterMap = (m: Map<string, Point[]>) =>
      new Map(
        [...m].map(([name, pts]) => [
          name,
          pts.filter((p) => isRecordInDateRange(p.t, dateRange.from, dateRange.to)),
        ])
      );
    return {
      pointsByLifter: filterMap(pointsByLifterUnfiltered),
      normalizedPointsByLifter: filterMap(normalizedPointsByLifterUnfiltered),
    };
  }, [pointsByLifterUnfiltered, normalizedPointsByLifterUnfiltered, dateRange]);

  return {
    exerciseOptions,
    displayNameToCanonical,
    selectedCanonical,
    selectedDisplayName,
    setSelectedDisplayName: setSelectedDisplayNameAndReset,
    reps,
    setReps: setRepsAndReset,
    effortMode,
    setEffortMode: setEffortModeAndReset,
    effortValue,
    setEffortValue: setEffortValueAndReset,
    unit,
    setUnit,
    toggleUnit,
    rows,
    pointsByLifter,
    normalizedPointsByLifter,
    historySessionDates,
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
    dateRange,
    setDateRange,
  };
}

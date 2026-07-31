import { useMemo, useReducer, useState } from 'react';
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
  buildTeamViewRowSnapshot,
  canonicalsMatchingFacets,
  CONJUGATE_ADDL_WTS,
  CONJUGATE_BARS,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_STANCES,
  detectDataUnit,
  groupByLiftType,
  isRecordInDateRange,
  convertEffort,
} from '@dyel/api';
import { LIFT_TYPE_ORDER } from '../../shared/liftTypeLabels';

interface LifterOverride {
  displayName?: string;
  reps?: number;
  effort?: Effort;
}

interface TeamRowState {
  overrides: Map<string, LifterOverride>;
  projected: Map<string, boolean>;
}

type TeamRowAction =
  | { type: 'setOverride'; lifter: string; value: LifterOverride }
  | { type: 'resetOverride'; field: keyof LifterOverride }
  | { type: 'toggleProjected'; lifter: string };

function teamRowReducer(state: TeamRowState, action: TeamRowAction): TeamRowState {
  if (action.type === 'setOverride') {
    const overrides = new Map(state.overrides);
    overrides.set(action.lifter, { ...overrides.get(action.lifter), ...action.value });
    return { ...state, overrides };
  }
  if (action.type === 'resetOverride') {
    return {
      ...state,
      overrides: new Map(
        [...state.overrides].map(([lifter, value]) => [
          lifter,
          { ...value, [action.field]: undefined },
        ])
      ),
    };
  }
  const projected = new Map(state.projected);
  projected.set(action.lifter, !(projected.get(action.lifter) ?? false));
  return { ...state, projected };
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
        res.model.points.get('e1rm').forEach((p) => canonicalSet.add(p.series));
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

  const [rowState, dispatchRow] = useReducer(teamRowReducer, {
    overrides: new Map(),
    projected: new Map(),
  });
  const overridesByLifter = rowState.overrides;
  const showProjectedByLifter = rowState.projected;

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
    dispatchRow({ type: 'resetOverride', field: 'displayName' });
  };

  const setRepsAndReset = (r: number) => {
    setReps(r);
    dispatchRow({ type: 'resetOverride', field: 'reps' });
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
    dispatchRow({ type: 'resetOverride', field: 'effort' });
  };

  const setEffortValueAndReset = (value: number) => {
    setEffortValue(value);
    dispatchRow({ type: 'resetOverride', field: 'effort' });
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

    const now = new Date();
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
              return res.model.points.get('e1rm').some((p) => p.series === canonical);
            })
          : exerciseOptions;

      const onExerciseChange = (displayName: string) =>
        dispatchRow({ type: 'setOverride', lifter: res.name, value: { displayName } });

      const onRepsChange = (r: number) =>
        dispatchRow({ type: 'setOverride', lifter: res.name, value: { reps: r } });

      const onEffortModeChange = (mode: EffortMode) => {
        const isDefaultRpe10 = effectiveEffortMode === 'rpe' && effectiveEffortValue === 10;
        const isDefaultPct100 = effectiveEffortMode === 'pct' && effectiveEffortValue === 100;
        const value =
          (isDefaultRpe10 && mode === 'pct') || (isDefaultPct100 && mode === 'rpe')
            ? mode === 'pct'
              ? 100
              : 10
            : convertEffort(
                effectiveReps,
                { mode: effectiveEffortMode, value: effectiveEffortValue },
                mode
              );
        dispatchRow({ type: 'setOverride', lifter: res.name, value: { effort: { mode, value } } });
      };

      const onEffortValueChange = (value: number) =>
        dispatchRow({
          type: 'setOverride',
          lifter: res.name,
          value: { effort: { mode: effectiveEffortMode, value } },
        });

      const showProjected = showProjectedByLifter.get(res.name) ?? false;
      const onToggleProjected = () => dispatchRow({ type: 'toggleProjected', lifter: res.name });

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

      return {
        lifterName: res.name,
        url: res.url,
        ...buildTeamViewRowSnapshot({
          result: res,
          canonical: effectiveCanonical,
          liftType: liftTypeByDisplayName.get(effectiveDisplayName) ?? null,
          reps: effectiveReps,
          effort: { mode: effectiveEffortMode, value: effectiveEffortValue },
          unit,
          now,
        }),
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
  const pointsByLifterUnfiltered = useMemo(() => {
    const raw = new Map<string, Point[]>();
    if (selectedCanonical) {
      for (const res of results) {
        const override = overridesByLifter.get(res.name);
        const effectiveDisplayName = override?.displayName ?? selectedDisplayName;
        const effectiveCanonical = displayNameToCanonical.get(effectiveDisplayName) ?? null;
        const points =
          res.status === 'success'
            ? res.model.points.get('e1rm').filter((p) => p.series === effectiveCanonical)
            : [];
        raw.set(res.name, points);
      }
    }
    return raw;
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

  // Apply date range filter to produce final pointsByLifter
  const pointsByLifter = useMemo(
    () =>
      new Map(
        [...pointsByLifterUnfiltered].map(([name, pts]) => [
          name,
          pts.filter((p) => isRecordInDateRange(p.t, dateRange.from, dateRange.to)),
        ])
      ),
    [pointsByLifterUnfiltered, dateRange]
  );

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

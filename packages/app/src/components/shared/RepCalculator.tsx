import { useState, useMemo, useEffect, useRef } from 'react';
import clsx from 'clsx';
import type {
  ConjugateAddlWt,
  ConjugateBar,
  ConjugateDataPair,
  ConjugateEquipment,
  ConjugateExercise,
  ConjugateStance,
  LiftType,
} from '@dyel/core';
import type { Point } from '@dyel/pipeline';
import {
  findBestE1RMFromPipeline,
  predictWeightForReps,
  predictRepsForWeight,
  type E1RMEstimate,
} from '../../pipeline/repCalculatorUtils';
import { usePipelineRepCalculator } from '../../hooks/pipeline/usePipelineRepCalculator';
import type { SplitRows } from '../../utils/appDataUtils';
import { distinctDisplayNames, LIFT_TABS } from '../../utils/appUtils';
import type { InputMode } from '../../utils/appUtils';
import styles from './RepCalculator.module.css';
import { CollapsibleSection } from '../shared/CollapsibleSection';

// Static constants for conjugate exercise facets (moved from @dyel/core)
const CONJUGATE_BARS = [
  'ssb',
  'american',
  'swiss',
  'cambered',
  'standard',
  'trap',
  'zercher',
  'duffalo',
  'dumbbell',
  'bamboo',
  'belt',
  'goblet',
] as const satisfies readonly ConjugateBar[];

const CONJUGATE_STANCES = [
  'close',
  'narrow',
  'sumo',
  'conventional',
  'competition',
  'front',
  'opposite',
  'medium',
  'wide',
  'romanian',
  'slingshot',
  'builder',
] as const satisfies readonly ConjugateStance[];

const CONJUGATE_EQUIPMENT = [
  'incline',
  'decline',
  'blocks',
  'deficit',
  'board',
  'pause',
  'floor',
  'box',
  'rack',
] as const satisfies readonly ConjugateEquipment[];

const CONJUGATE_ADDL_WTS = [
  'bands',
  'rev. bands',
  'chains',
] as const satisfies readonly ConjugateAddlWt[];

// Helper function to compute family key for exercise grouping
function familyKey(ex: ConjugateExercise): string {
  return [ex.type, ex.bar ?? '', ex.stance ?? '', ex.equipment ?? ''].join('|');
}

const LIFT_LABELS: Record<LiftType, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  accessory: 'Accessory',
};

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

function sourceNote(estimate: E1RMEstimate): string {
  switch (estimate.method) {
    case 'exact':
      return `Based on ${estimate.sourceName} · ${estimate.date.toLocaleDateString()}`;
    case 'variantFactor':
      return `Projected from ${estimate.sourceName} (${estimate.date.toLocaleDateString()})`;
  }
}

export function RepCalculator({
  tabRows,
  baselineNames,
  inputMode,
  url,
  pastedText,
  refreshToken,
}: {
  tabRows: Record<LiftType, SplitRows>;
  baselineNames: Partial<Record<string, string>>;
  inputMode: InputMode;
  url: string;
  pastedText: string;
  refreshToken: number;
}) {
  const [liftType, setLiftType] = useState<LiftType>('squat');
  const [selectedName, setSelectedName] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedBar, setSelectedBar] = useState<ConjugateBar | null>(null);
  const [selectedStance, setSelectedStance] = useState<ConjugateStance | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<ConjugateEquipment | null>(null);
  const [selectedAddlWt, setSelectedAddlWt] = useState<ConjugateAddlWt | null>(null);

  const model = usePipelineRepCalculator(inputMode, url, pastedText, refreshToken);

  const pairsByTab = useMemo(() => {
    return Object.fromEntries(LIFT_TABS.map((tab) => [tab, tabRows[tab].maxEffort])) as Record<
      LiftType,
      ConjugateDataPair[]
    >;
  }, [tabRows]);

  const pointsByCanonical = useMemo(() => {
    const points: Record<string, Point[]> = {};
    for (const pairs of Object.values(pairsByTab)) {
      for (const [exercise, session] of pairs) {
        const canonical = exercise.displayName;
        if (!points[canonical]) {
          points[canonical] = [];
        }
        points[canonical].push({
          t: session.date.getTime(),
          v: session.e1rm,
          series: canonical,
          tags: new Set(['lift:' + exercise.type]),
        });
      }
    }
    return points;
  }, [pairsByTab]);

  const pairs = pairsByTab[liftType];
  const unit = pairs[0]?.[1].unit ?? 'lbs';
  const hasAccessories = tabRows.accessory.all.length > 0;

  const exercisesForType = useMemo(
    () => distinctDisplayNames(pairs).sort((a, b) => a.localeCompare(b)),
    [pairs]
  );

  useEffect(() => {
    const name = exercisesForType[0] ?? '';
    const ex = pairs.find(([e]) => e.displayName === name)?.[0] ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedName(name);
    setReps('');
    setWeight('');
    setSelectedBar(ex?.bar ?? null);
    setSelectedStance(ex?.stance ?? null);
    setSelectedEquipment(ex?.equipment ?? null);
    setSelectedAddlWt(ex?.addlWts[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liftType, exercisesForType]);

  const selectedExercise = useMemo(
    () => pairs.find(([ex]) => ex.displayName === selectedName)?.[0] ?? null,
    [pairs, selectedName]
  );

  function handleSelectedNameChange(name: string) {
    setSelectedName(name);
    const ex = pairs.find(([e]) => e.displayName === name)?.[0] ?? null;
    setSelectedBar(ex?.bar ?? null);
    setSelectedStance(ex?.stance ?? null);
    setSelectedEquipment(ex?.equipment ?? null);
    setSelectedAddlWt(ex?.addlWts[0] ?? null);
  }

  const facetExercise = useMemo(() => {
    if (!selectedExercise) {
      return null;
    }
    if (liftType === 'accessory') {
      return selectedExercise;
    }
    const candidate = {
      type: liftType,
      bar: selectedBar,
      stance: selectedStance,
      equipment: selectedEquipment,
    } as ConjugateExercise;
    const addlWts = selectedAddlWt ? [selectedAddlWt] : [];
    const match = pairs.find(
      ([ex]) =>
        familyKey(ex) === familyKey(candidate) &&
        ex.addlWts.length === addlWts.length &&
        (addlWts.length === 0 || ex.addlWts[0] === addlWts[0])
    )?.[0];
    if (match) {
      return match;
    }
    return {
      type: liftType,
      bar: selectedBar,
      stance: selectedStance,
      equipment: selectedEquipment,
      addlWts,
      displayName: 'placeholder',
      averageIndex: null,
      expectedBaseline: null,
      status: null,
      diagnostic: null,
      effects: [],
    } satisfies ConjugateExercise;
  }, [
    selectedExercise,
    liftType,
    pairs,
    selectedBar,
    selectedStance,
    selectedEquipment,
    selectedAddlWt,
  ]);

  const estimate = useMemo(() => {
    if (!facetExercise || !baselineNames[liftType]) {
      return null;
    }
    const baselineCanonical = baselineNames[liftType];
    const baselinePoints = pointsByCanonical[baselineCanonical];
    if (!baselinePoints) {
      return null;
    }
    return findBestE1RMFromPipeline(
      facetExercise.displayName,
      baselineCanonical,
      baselinePoints,
      model,
      baselineNames[liftType]!
    );
  }, [facetExercise, baselineNames, liftType, pointsByCanonical, model]);

  // Keep a ref so the exercise-change effect always reads the current reps value
  // without reps being a dependency (which would cause circular updates when typing weight).
  const repsRef = useRef(reps);
  useEffect(() => {
    repsRef.current = reps;
  });

  useEffect(() => {
    if (!estimate) {
      return;
    }
    const r = parseFloat(repsRef.current);
    if (!isNaN(r) && r > 0) {
      setWeight(String(roundTo5(predictWeightForReps(estimate.e1rm, r))));
    }
  }, [estimate]);

  function handleRepsChange(val: string) {
    setReps(val);
    const r = parseFloat(val);
    if (!isNaN(r) && r > 0 && estimate) {
      setWeight(String(roundTo5(predictWeightForReps(estimate.e1rm, r))));
    }
  }

  function handleWeightChange(val: string) {
    setWeight(val);
    const w = parseFloat(val);
    if (!isNaN(w) && w > 0 && estimate) {
      setReps(predictRepsForWeight(estimate.e1rm, w).toFixed(1));
    }
  }

  return (
    <CollapsibleSection label="Rep Calculator">
      <div className={styles.card}>
        <div className={styles.leftCol}>
          <span className={styles.sectionLabel}>Rep Calculator</span>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Lift Type</div>
            <div className={styles.chipGroup}>
              {(Object.keys(LIFT_LABELS) as LiftType[])
                .filter((t) => t !== 'accessory' || hasAccessories)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => setLiftType(t)}
                    className={clsx(styles.chip, liftType === t && styles.chipActive)}
                  >
                    {LIFT_LABELS[t]}
                  </button>
                ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Exercise</div>
            <select
              value={selectedName}
              onChange={(e) => handleSelectedNameChange(e.target.value)}
              className={styles.input}
            >
              {exercisesForType.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {liftType !== 'accessory' && (
            <div className={styles.facetGrid}>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Bar</div>
                <select
                  value={selectedBar ?? ''}
                  onChange={(e) => setSelectedBar((e.target.value || null) as ConjugateBar | null)}
                  className={styles.input}
                >
                  <option value="">—</option>
                  {CONJUGATE_BARS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Stance</div>
                <select
                  value={selectedStance ?? ''}
                  onChange={(e) =>
                    setSelectedStance((e.target.value || null) as ConjugateStance | null)
                  }
                  className={styles.input}
                >
                  <option value="">—</option>
                  {CONJUGATE_STANCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Equipment</div>
                <select
                  value={selectedEquipment ?? ''}
                  onChange={(e) =>
                    setSelectedEquipment((e.target.value || null) as ConjugateEquipment | null)
                  }
                  className={styles.input}
                >
                  <option value="">—</option>
                  {CONJUGATE_EQUIPMENT.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Additional Weight</div>
                <select
                  value={selectedAddlWt ?? ''}
                  onChange={(e) =>
                    setSelectedAddlWt((e.target.value || null) as ConjugateAddlWt | null)
                  }
                  className={styles.input}
                >
                  <option value="">—</option>
                  {CONJUGATE_ADDL_WTS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className={styles.rightCol}>
          {exercisesForType.length === 0 ? (
            <p className={styles.emptyNote}>
              No {LIFT_LABELS[liftType].toLowerCase()} exercises found in your data.
            </p>
          ) : estimate === null ? (
            <p className={styles.emptyNote}>
              No session data found in the selected window — try widening the date range.
            </p>
          ) : (
            <>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Reps</div>
                <input
                  id="calc-reps"
                  type="number"
                  min="1"
                  max="20"
                  value={reps}
                  onChange={(e) => handleRepsChange(e.target.value)}
                  placeholder="—"
                  className={styles.input}
                />
              </div>

              <div className={styles.swapIcon}>↕</div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>Weight ({unit})</div>
                <input
                  id="calc-weight"
                  type="number"
                  min="0"
                  value={weight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder="—"
                  className={styles.input}
                />
              </div>

              <div className={styles.e1rmDisplay}>
                e1RM: {Math.round(estimate.e1rm)} {unit}
              </div>

              <p className={styles.sourceNote}>{sourceNote(estimate)}</p>
            </>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}

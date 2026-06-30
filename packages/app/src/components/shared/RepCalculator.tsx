import { useState, useMemo, useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  findBestE1RM,
  predictWeightForReps,
  predictRepsForWeight,
  applyFilters,
  buildSessionStats,
} from '@dyel/core';
import type {
  ConjugateDataPair,
  E1RMEstimate,
  FilterState,
  LiftType,
  SessionStats,
} from '@dyel/core';
import type { SplitRows } from '../../utils/appDataUtils';
import { distinctDisplayNames, LIFT_TABS } from '../../utils/appUtils';
import styles from './RepCalculator.module.css';
import { CollapsibleSection } from '../shared/CollapsibleSection';

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
  tabFilters,
}: {
  tabRows: Record<LiftType, SplitRows>;
  baselineNames: Partial<Record<string, string>>;
  tabFilters: Record<LiftType, FilterState>;
}) {
  const [liftType, setLiftType] = useState<LiftType>('squat');
  const [selectedName, setSelectedName] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  const { pairsByTab, statsByTab } = useMemo(() => {
    const today = new Date();
    const pairs = Object.fromEntries(
      LIFT_TABS.map((tab) => [tab, applyFilters(tabRows[tab].maxEffort, tabFilters[tab])])
    ) as Record<LiftType, ConjugateDataPair[]>;
    const stats = Object.fromEntries(
      LIFT_TABS.map((tab) => [tab, buildSessionStats(pairs[tab], baselineNames, today)])
    ) as Record<LiftType, SessionStats>;
    return { pairsByTab: pairs, statsByTab: stats };
  }, [tabRows, tabFilters, baselineNames]);

  const pairs = pairsByTab[liftType];
  const stats = statsByTab[liftType];

  const unit = pairs[0]?.[1].unit ?? 'lbs';

  const hasAccessories = tabRows.accessory.all.length > 0;

  const exercisesForType = useMemo(
    () => distinctDisplayNames(pairs).sort((a, b) => a.localeCompare(b)),
    [pairs]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedName(exercisesForType[0] ?? '');
    setReps('');
    setWeight('');
  }, [liftType, exercisesForType]);

  const selectedExercise = useMemo(
    () => pairs.find(([ex]) => ex.displayName === selectedName)?.[0] ?? null,
    [pairs, selectedName]
  );

  const estimate = useMemo(() => {
    if (!selectedExercise) {
      return null;
    }
    return findBestE1RM(selectedExercise, stats, baselineNames[liftType], new Date());
  }, [selectedExercise, stats, baselineNames, liftType]);

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
    <CollapsibleSection label={'Rep Calculator'}>
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
              onChange={(e) => setSelectedName(e.target.value)}
              className={styles.input}
            >
              {exercisesForType.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
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

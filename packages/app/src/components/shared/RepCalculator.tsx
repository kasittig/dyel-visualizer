import { useState, useMemo, useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  CONJUGATE_BARS,
  CONJUGATE_STANCES,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_ADDL_WTS,
  facetsFromTags,
  facetFamilyKey,
} from '@dyel/pipeline';
import type {
  ConjugateAddlWt,
  ConjugateBar,
  ConjugateEquipment,
  ConjugateStance,
} from '@dyel/pipeline';
import type { LiftType, SplitRows } from '@dyel/api';
import { usePipelineModel } from '../../context/PipelineContext';
import {
  predictWeightForReps,
  predictRepsForWeight,
  resolveE1RMEstimate,
  convertE1RMToDisplayUnit,
} from '../../pipeline/repCalculatorUtils';
import type { E1RMEstimate } from '../../pipeline/repCalculatorUtils';
import styles from './RepCalculator.module.css';
import { CollapsibleSection } from './CollapsibleSection.tsx';

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
}: {
  tabRows: Record<LiftType, SplitRows>;
  baselineNames: Partial<Record<LiftType, string>>;
}) {
  const [liftType, setLiftType] = useState<LiftType>('squat');
  const [selectedCanonical, setSelectedCanonical] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedBar, setSelectedBar] = useState<ConjugateBar | null>(null);
  const [selectedStance, setSelectedStance] = useState<ConjugateStance | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<ConjugateEquipment | null>(null);
  const [selectedAddlWt, setSelectedAddlWt] = useState<ConjugateAddlWt | null>(null);
  const [selectedEquipmentMagnitude, setSelectedEquipmentMagnitude] = useState<string | null>(null);

  const { status: pipelineStatus, model: pipelineModel } = usePipelineModel();
  const records = tabRows[liftType].maxEffort;

  const unit = useMemo(() => {
    const found = records.find((r) => r.meta?.rawUnit);
    return (found?.meta?.rawUnit === 'lbs' ? 'lbs' : 'kg') as 'lbs' | 'kg';
  }, [records]);

  const hasAccessories = tabRows.accessory.all.length > 0;

  const availableMagnitudes = useMemo(() => {
    if (!selectedEquipment || !['board', 'blocks', 'deficit'].includes(selectedEquipment)) {
      return [];
    }

    const mags = records
      .map((r) => facetsFromTags(r.tags))
      .filter((f) => f.equipment === selectedEquipment && f.equipmentMagnitude)
      .map((f) => f.equipmentMagnitude!);

    return Array.from(new Set(mags)).sort((a, b) => {
      const [nA, nB] = [parseInt(a, 10), parseInt(b, 10)];
      return isNaN(nA) || isNaN(nB) ? a.localeCompare(b) : nA - nB;
    });
  }, [selectedEquipment, records]);

  const exercisesForType = useMemo(() => {
    const seen = new Map<string, { canonical: string; label: string }>();
    records.forEach((r) => {
      if (!seen.has(r.canonical)) {
        seen.set(r.canonical, { canonical: r.canonical, label: r.meta?.rawExercise ?? r.exercise });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [records]);

  // --- ELIMINATED THE EFFECT ENTIRELY ---
  // Derive the active canonical key inline during render.
  // If the user's manual selection is no longer valid for this liftType, default to the first available exercise.
  const activeCanonical = records.some((r) => r.canonical === selectedCanonical)
    ? selectedCanonical
    : (exercisesForType[0]?.canonical ?? '');

  const selectedRecord = useMemo(
    () => records.find((r) => r.canonical === activeCanonical),
    [records, activeCanonical]
  );

  // Unified state updater used exclusively by user interactions
  const syncFacetsAndInputs = (canonical: string, rec?: (typeof records)[number]) => {
    const f = rec ? facetsFromTags(rec.tags) : null;
    setSelectedCanonical(canonical);
    setReps('');
    setWeight('');
    setSelectedBar(f?.bar ?? null);
    setSelectedStance(f?.stance ?? null);
    setSelectedEquipment(f?.equipment ?? null);
    setSelectedAddlWt(f?.addlWts?.[0] ?? null);
    setSelectedEquipmentMagnitude(f?.equipmentMagnitude ?? null);
  };

  function handleSelectedCanonicalChange(canonical: string) {
    syncFacetsAndInputs(
      canonical,
      records.find((r) => r.canonical === canonical)
    );
  }

  // Derive the effective canonical for e1RM lookup
  const effectiveCanonical = useMemo(() => {
    if (!selectedRecord) {
      return null;
    }
    if (liftType === 'accessory') {
      return selectedRecord.canonical;
    }

    const candidateKey = [
      liftType,
      selectedBar,
      selectedStance !== 'competition' && selectedStance,
      selectedEquipment,
    ]
      .filter(Boolean)
      .join('-');

    const match = records.find((rec) => {
      const fKey = facetFamilyKey(rec.canonical);
      const f = facetsFromTags(rec.tags);

      const keyMatch =
        fKey === candidateKey ||
        (f.bar === selectedBar &&
          f.stance === selectedStance &&
          f.equipment === selectedEquipment &&
          f.equipmentMagnitude === selectedEquipmentMagnitude);

      if (!keyMatch) {
        return false;
      }
      return selectedAddlWt ? f.addlWts.includes(selectedAddlWt) : f.addlWts.length === 0;
    });

    return match ? match.canonical : selectedRecord.canonical;
  }, [
    selectedRecord,
    liftType,
    selectedBar,
    selectedStance,
    selectedEquipment,
    selectedEquipmentMagnitude,
    selectedAddlWt,
    records,
  ]);

  const estimate = useMemo(() => {
    if (!effectiveCanonical || pipelineStatus !== 'success' || !pipelineModel) {
      return null;
    }

    return resolveE1RMEstimate({
      liftType,
      targetCanonical: effectiveCanonical,
      baselineName: baselineNames[liftType],
      today: new Date(),
      model: pipelineModel.model,
      e1rmPoints: pipelineModel.pointsByDeriver.get('e1rm-max-effort') ?? [],
    });
  }, [effectiveCanonical, pipelineStatus, pipelineModel, baselineNames, liftType]);

  // Ref safely managed via mutations during event handlers
  const repsRef = useRef(reps);

  const syncWeightFromReps = (rVal: string) => {
    const r = parseFloat(rVal);
    if (r > 0 && estimate) {
      const dispE1RM = convertE1RMToDisplayUnit(estimate.e1rm, unit);
      setWeight(String(roundTo5(predictWeightForReps(dispE1RM, r))));
    }
  };

  useEffect(() => {
    syncWeightFromReps(repsRef.current);
  }, [estimate, unit]);

  function handleRepsChange(val: string) {
    setReps(val);
    syncWeightFromReps(val);
  }

  function handleWeightChange(val: string) {
    setWeight(val);
    const w = parseFloat(val);
    if (w > 0 && estimate) {
      const dispE1RM = convertE1RMToDisplayUnit(estimate.e1rm, unit);
      setReps(predictRepsForWeight(dispE1RM, w).toFixed(1));
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
              value={selectedCanonical}
              onChange={(e) => handleSelectedCanonicalChange(e.target.value)}
              className={styles.input}
            >
              {exercisesForType.map((ex) => (
                <option key={ex.canonical} value={ex.canonical}>
                  {ex.label}
                </option>
              ))}
            </select>
          </div>

          {liftType !== 'accessory' && (
            <div className={styles.facetGrid}>
              {(
                [
                  {
                    label: 'Bar',
                    value: selectedBar,
                    change: setSelectedBar,
                    opts: CONJUGATE_BARS,
                  },
                  {
                    label: 'Stance',
                    value: selectedStance,
                    change: setSelectedStance,
                    opts: CONJUGATE_STANCES,
                  },
                  {
                    label: 'Equipment',
                    value: selectedEquipment,
                    change: setSelectedEquipment,
                    opts: CONJUGATE_EQUIPMENT,
                  },
                  {
                    label: 'Magnitude',
                    value: selectedEquipmentMagnitude,
                    change: setSelectedEquipmentMagnitude,
                    opts: availableMagnitudes,
                    show:
                      !!selectedEquipment &&
                      ['board', 'blocks', 'deficit'].includes(selectedEquipment),
                  },
                  {
                    label: 'Additional Weight',
                    value: selectedAddlWt,
                    change: setSelectedAddlWt,
                    opts: CONJUGATE_ADDL_WTS,
                  },
                ] as Array<{
                  label: string;
                  value: string | null;
                  change: (val: string | null) => void; // Uses structural variance contextually mapped to the component fields
                  opts: readonly string[] | string[];
                  show?: boolean;
                }>
              ).map(
                ({ label, value, change, opts, show = true }) =>
                  show && (
                    <div key={label} className={styles.field}>
                      <div className={styles.fieldLabel}>{label}</div>
                      <select
                        value={value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          change(val);
                        }}
                        className={styles.input}
                      >
                        <option value="">—</option>
                        {opts.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
              )}
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
              {[
                {
                  id: 'calc-reps',
                  label: 'Reps',
                  val: reps,
                  change: handleRepsChange,
                  min: 1,
                  max: 20,
                },
                {
                  id: 'calc-weight',
                  label: `Weight (${unit})`,
                  val: weight,
                  change: handleWeightChange,
                  min: 0,
                },
              ].map(({ id, label, val, change, ...bounds }, idx) => (
                <div key={id} style={{ display: 'contents' }}>
                  {idx === 1 && <div className={styles.swapIcon}>↕</div>}
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>{label}</div>
                    <input
                      id={id}
                      type="number"
                      value={val}
                      onChange={(e) => change(e.target.value)}
                      placeholder="—"
                      className={styles.input}
                      {...bounds}
                    />
                  </div>
                </div>
              ))}
              <div className={styles.e1rmDisplay}>
                e1RM: {Math.round(convertE1RMToDisplayUnit(estimate.e1rm, unit))} {unit}
              </div>
              <p className={styles.sourceNote}>{sourceNote(estimate)}</p>
            </>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}

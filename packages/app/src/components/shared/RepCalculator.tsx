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
    for (const rec of records) {
      if (rec.meta?.rawUnit) {
        return (rec.meta.rawUnit === 'lbs' ? 'lbs' : 'kg') as 'lbs' | 'kg';
      }
    }
    return 'lbs';
  }, [records]);

  const hasAccessories = tabRows.accessory.all.length > 0;

  // Derive available equipment magnitudes for the currently selected equipment
  const availableMagnitudes = useMemo(() => {
    if (!selectedEquipment || !['board', 'blocks', 'deficit'].includes(selectedEquipment)) {
      return [];
    }
    const magnitudes = new Set<string>();
    for (const rec of records) {
      const facets = facetsFromTags(rec.tags);
      if (facets.equipment === selectedEquipment && facets.equipmentMagnitude) {
        magnitudes.add(facets.equipmentMagnitude);
      }
    }
    return Array.from(magnitudes).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return isNaN(numA) || isNaN(numB) ? a.localeCompare(b) : numA - numB;
    });
  }, [selectedEquipment, records]);

  // Build a unique list of exercises by canonical, keeping first-seen raw label for display
  const exercisesForType = useMemo(() => {
    const seen = new Map<string, { canonical: string; label: string }>();
    for (const rec of records) {
      if (!seen.has(rec.canonical)) {
        const label = rec.meta?.rawExercise ?? rec.exercise;
        seen.set(rec.canonical, { canonical: rec.canonical, label });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [records]);

  useEffect(() => {
    const firstExercise = exercisesForType[0];
    if (!firstExercise) {
      // Syncing local facet-selection state to the (rare) case where the exercise list has
      // become empty — mirrors the exhaustive-deps suppression already used at the bottom
      // of this effect for the same reason (initial-selection sync, not external subscription).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCanonical('');
      setReps('');
      setWeight('');
      setSelectedBar(null);
      setSelectedStance(null);
      setSelectedEquipment(null);
      setSelectedAddlWt(null);
      setSelectedEquipmentMagnitude(null);
      return;
    }

    const selectedRecord = records.find((r) => r.canonical === firstExercise.canonical);
    if (selectedRecord) {
      const facets = facetsFromTags(selectedRecord.tags);
      setSelectedCanonical(firstExercise.canonical);
      setReps('');
      setWeight('');
      setSelectedBar(facets.bar);
      setSelectedStance(facets.stance);
      setSelectedEquipment(facets.equipment);
      setSelectedAddlWt(facets.addlWts[0] ?? null);
      setSelectedEquipmentMagnitude(facets.equipmentMagnitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liftType, exercisesForType]);

  const selectedRecord = useMemo(
    () => records.find((r) => r.canonical === selectedCanonical),
    [records, selectedCanonical]
  );

  function handleSelectedCanonicalChange(canonical: string) {
    setSelectedCanonical(canonical);
    const rec = records.find((r) => r.canonical === canonical);
    if (rec) {
      const facets = facetsFromTags(rec.tags);
      setSelectedBar(facets.bar);
      setSelectedStance(facets.stance);
      setSelectedEquipment(facets.equipment);
      setSelectedAddlWt(facets.addlWts[0] ?? null);
      setSelectedEquipmentMagnitude(facets.equipmentMagnitude);
    }
  }

  // Derive the effective canonical for e1RM lookup
  const effectiveCanonical = useMemo(() => {
    if (!selectedRecord) {
      return null;
    }

    if (liftType === 'accessory') {
      return selectedRecord.canonical;
    }

    // For comp lifts, check if selected facets match any existing record
    // by comparing family keys (bar/stance/equipment, excluding addlWts)
    const candidateFamilyKey = `${liftType}${selectedBar ? `-${selectedBar}` : ''}${selectedStance && selectedStance !== 'competition' ? `-${selectedStance}` : ''}${selectedEquipment ? `-${selectedEquipment}` : ''}`;

    for (const rec of records) {
      const recFamilyKey = facetFamilyKey(rec.canonical);
      const recFacets = facetsFromTags(rec.tags);

      // Match on bar/stance/equipment/magnitude and addlWt
      if (
        recFamilyKey === candidateFamilyKey ||
        (recFacets.bar === selectedBar &&
          recFacets.stance === selectedStance &&
          recFacets.equipment === selectedEquipment &&
          recFacets.equipmentMagnitude === selectedEquipmentMagnitude)
      ) {
        // If addlWt is specified, try to find exact match
        if (selectedAddlWt) {
          if (recFacets.addlWts.includes(selectedAddlWt)) {
            return rec.canonical;
          }
        } else {
          // If no addlWt selected, prefer a record with no addlWts
          if (recFacets.addlWts.length === 0) {
            return rec.canonical;
          }
        }
      }
    }

    // No exact match found; use the selected record's canonical as fallback
    // (it's the closest thing we have)
    return selectedRecord.canonical;
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
      model: pipelineModel.model,
      e1rmPoints: pipelineModel.pointsByDeriver.get('e1rm') ?? [],
    });
  }, [effectiveCanonical, pipelineStatus, pipelineModel, baselineNames, liftType]);

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
      setWeight(
        String(roundTo5(predictWeightForReps(convertE1RMToDisplayUnit(estimate.e1rm, unit), r)))
      );
    }
  }, [estimate, unit]);

  function handleRepsChange(val: string) {
    setReps(val);
    const r = parseFloat(val);
    if (!isNaN(r) && r > 0 && estimate) {
      setWeight(
        String(roundTo5(predictWeightForReps(convertE1RMToDisplayUnit(estimate.e1rm, unit), r)))
      );
    }
  }

  function handleWeightChange(val: string) {
    setWeight(val);
    const w = parseFloat(val);
    if (!isNaN(w) && w > 0 && estimate) {
      setReps(predictRepsForWeight(convertE1RMToDisplayUnit(estimate.e1rm, unit), w).toFixed(1));
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

              {selectedEquipment && ['board', 'blocks', 'deficit'].includes(selectedEquipment) && (
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>Magnitude</div>
                  <select
                    value={selectedEquipmentMagnitude ?? ''}
                    onChange={(e) =>
                      setSelectedEquipmentMagnitude((e.target.value || null) as string | null)
                    }
                    className={styles.input}
                  >
                    <option value="">—</option>
                    {availableMagnitudes.map((mag) => (
                      <option key={mag} value={mag}>
                        {mag}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

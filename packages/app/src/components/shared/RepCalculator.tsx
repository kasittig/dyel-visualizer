import clsx from 'clsx';
import {
  CONJUGATE_BARS,
  CONJUGATE_STANCES,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_ADDL_WTS,
} from '@dyel/api';
import type { LiftType, SplitRows, E1RMEstimate } from '@dyel/api';
import { convertE1RMToDisplayUnit } from '@dyel/api';
import { usePipelineRepCalculator } from '../../hooks/pipeline/usePipelineRepCalculator';
import styles from './RepCalculator.module.css';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';

const LIFT_LABELS: Record<LiftType, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  accessory: 'Accessory',
};

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
  const {
    liftType,
    setLiftType,
    exercisesForType,
    activeCanonical,
    selectedBar,
    setSelectedBar,
    selectedStance,
    setSelectedStance,
    selectedEquipment,
    setSelectedEquipment,
    selectedAddlWt,
    setSelectedAddlWt,
    selectedEquipmentMagnitude,
    setSelectedEquipmentMagnitude,
    availableMagnitudes,
    reps,
    weight,
    handleRepsChange,
    handleWeightChange,
    handleSelectedCanonicalChange,
    unit,
    estimate,
  } = usePipelineRepCalculator(tabRows, baselineNames);

  const hasAccessories = tabRows.accessory.all.length > 0;

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
              value={activeCanonical}
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

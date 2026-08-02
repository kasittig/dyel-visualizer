import clsx from 'clsx';
import {
  CONJUGATE_BARS,
  CONJUGATE_STANCES,
  CONJUGATE_EQUIPMENT,
  CONJUGATE_ADDL_WTS,
} from '@dyel/api/display';
import type { LiftType, SplitRows } from '@dyel/api';
import { usePipelineRepCalculator } from './usePipelineRepCalculator';
import styles from './RepCalculator.module.css';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import { E1RMCell, TypeaheadDropdown } from '../../shared/components';
import { LIFT_TYPE_LABELS, LIFT_TYPE_ORDER } from '../../shared/liftTypeLabels';

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
    exerciseLabels,
    activeLabel,
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
    actualE1rmDisplay,
    projectedE1rmDisplay,
    e1rmSourceLabel,
    e1rmFamilyRecentDisplay,
    e1rmFamilyRecentSourceLabel,
  } = usePipelineRepCalculator(tabRows, baselineNames);

  return (
    <CollapsibleSection label="Rep Calculator">
      <div className={styles.card}>
        <div className={styles.leftCol}>
          <span className={styles.sectionLabel}>Rep Calculator</span>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Lift Type</div>
            <div className={styles.chipGroup}>
              {LIFT_TYPE_ORDER.filter(
                (t) => t !== 'accessory' || tabRows.accessory.all.length > 0
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setLiftType(t)}
                  className={clsx(styles.chip, liftType === t && styles.chipActive)}
                >
                  {LIFT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Exercise</div>
            <TypeaheadDropdown
              options={exerciseLabels}
              value={activeLabel || null}
              onChange={handleSelectedCanonicalChange}
              placeholder="Search exercise..."
            />
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
                ] as {
                  label: string;
                  value: string | null;
                  change: (v: string | null) => void;
                  opts: readonly string[];
                  show?: boolean;
                }[]
              ).map(
                ({ label, value, change, opts, show = true }) =>
                  show && (
                    <div key={label} className={styles.field}>
                      <div className={styles.fieldLabel}>{label}</div>
                      <select
                        value={value ?? ''}
                        onChange={(e) => change(e.target.value || null)}
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
              No {LIFT_TYPE_LABELS[liftType].toLowerCase()} exercises found in your data.
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
                e1RM:{' '}
                <E1RMCell
                  actualDisplay={actualE1rmDisplay ?? projectedE1rmDisplay ?? ''}
                  projectedDisplay={projectedE1rmDisplay}
                  sourceLabel={e1rmSourceLabel}
                  projectedFamilyRecentDisplay={e1rmFamilyRecentDisplay}
                  familyRecentSourceLabel={e1rmFamilyRecentSourceLabel}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}

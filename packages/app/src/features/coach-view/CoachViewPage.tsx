import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useCoachViewData } from './useCoachViewData';
import { useCoachViewSelection } from './useCoachViewSelection';
import type { CoachViewRow } from './useCoachViewSelection';
import { LIFT_TYPE_LABELS } from '../../shared/liftTypeLabels';
import {
  TypeaheadDropdown,
  TableCard,
  Table,
  TableHeadRow,
  TableRow,
  TableCell,
  E1RMCell,
} from '../../shared/components';
import styles from './CoachViewPage.module.css';

interface CoachViewColumn {
  header: string;
  headerClassName?: string;
  cellClassName?: string | ((row: CoachViewRow) => string | boolean | undefined);
  variant?: 'left' | 'mono';
  render: (row: CoachViewRow) => ReactNode;
}

export function CoachViewPage() {
  const dataState = useCoachViewData();
  const {
    exerciseOptions,
    selectedDisplayName,
    setSelectedDisplayName,
    reps,
    setReps,
    unit,
    setUnit,
    selectedCanonical,
    rows,
    erroredLifterCount,
    selectedBar,
    setSelectedBar,
    selectedStance,
    setSelectedStance,
    selectedEquipment,
    setSelectedEquipment,
    selectedAddlWt,
    setSelectedAddlWt,
    barOptions,
    stanceOptions,
    equipmentOptions,
    addlWtOptions,
    selectedLiftType,
    setSelectedLiftType,
    liftTypeOptions,
  } = useCoachViewSelection(dataState.status === 'success' ? dataState.data : []);

  const columns: CoachViewColumn[] = [
    {
      header: 'Lifter',
      variant: 'left',
      headerClassName: styles.lifterHeaderCell,
      cellClassName: () => clsx(styles.cellTint, styles.lifterCell),
      render: (row) => <span title={row.lifterName}>{row.lifterName}</span>,
    },
    {
      header: 'Exercise',
      variant: 'left',
      cellClassName: () => clsx(styles.cellTint, styles.controlCell),
      render: (row) => (
        <TypeaheadDropdown
          options={row.availableExerciseOptions}
          value={row.effectiveDisplayName || null}
          onChange={row.onExerciseChange}
          placeholder="Search exercise..."
        />
      ),
    },
    {
      header: 'Target weight',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      render: (row) => row.targetWeightDisplay,
    },
    {
      header: 'Reps',
      variant: 'left',
      cellClassName: () => clsx(styles.cellTint, styles.repsCell),
      render: (row) => (
        <input
          type="number"
          min={1}
          max={20}
          value={row.effectiveReps}
          className={styles.repsInput}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            row.onRepsChange(Number.isNaN(val) || val < 1 ? 1 : val);
          }}
        />
      ),
    },
    {
      header: 'Sessions',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      render: (row) => row.sessionCount,
    },
    {
      header: 'Date',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      render: (row) => row.lastPerformedDateDisplay,
    },
    {
      header: 'Last set',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      render: (row) => row.lastPerformedSetDisplay,
    },
    {
      header: 'e1RM',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      render: (row) => (
        <E1RMCell
          actualDisplay={row.e1rmDisplay}
          projectedDisplay={row.e1rmProjectedDisplay}
          sourceLabel={row.e1rmSourceLabel}
        />
      ),
    },
  ];

  if (dataState.status === 'loading') {
    return (
      <main className={styles.main}>
        <p>Loading lifters...</p>
      </main>
    );
  }

  if (dataState.status === 'error') {
    return (
      <main className={styles.main}>
        <p className={styles.errorMsg}>{dataState.message}</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <p className={styles.backLink}>
        <a href="." className={styles.accentLink}>
          ← Back to DYEL Visualizer
        </a>
      </p>
      <div className={styles.coachViewPage}>Coach View</div>
      <div className={styles.header}>
        <TypeaheadDropdown
          options={exerciseOptions}
          value={selectedDisplayName || null}
          onChange={setSelectedDisplayName}
          placeholder="Search exercise..."
        />
        for
        <input
          type="number"
          min={1}
          max={20}
          value={reps}
          className={styles.repsInput}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setReps(Number.isNaN(val) || val < 1 ? 1 : val);
          }}
        />
        rep{reps > 1 ? 's' : ''} (in
        <div className={styles.chipGroup}>
          {(['lbs', 'kg'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={clsx(styles.chip, unit === u && styles.chipActive)}
            >
              {u}
            </button>
          ))}
          )
        </div>
      </div>

      <div className={styles.headerRow}>
        <div className={styles.facetField}>
          <div className={styles.facetLabel}>Lift Type</div>
          <div className={styles.chipGroup}>
            <button
              type="button"
              onClick={() => setSelectedLiftType(null)}
              className={clsx(styles.chip, selectedLiftType === null && styles.chipActive)}
            >
              All
            </button>
            {liftTypeOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedLiftType(t)}
                className={clsx(styles.chip, selectedLiftType === t && styles.chipActive)}
              >
                {LIFT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        {(
          [
            { label: 'Bar', value: selectedBar, change: setSelectedBar, opts: barOptions },
            {
              label: 'Stance',
              value: selectedStance,
              change: setSelectedStance,
              opts: stanceOptions,
            },
            {
              label: 'Equipment',
              value: selectedEquipment,
              change: setSelectedEquipment,
              opts: equipmentOptions,
            },
            {
              label: 'Additional Weight',
              value: selectedAddlWt,
              change: setSelectedAddlWt,
              opts: addlWtOptions,
            },
          ] as {
            label: string;
            value: string | null;
            change: (v: string | null) => void;
            opts: readonly string[];
          }[]
        ).map(({ label, value, change, opts }) => (
          <div key={label} className={styles.facetField}>
            <div className={styles.facetLabel}>{label}</div>
            <select
              aria-label={label}
              value={value ?? ''}
              onChange={(e) => change(e.target.value || null)}
              className={styles.facetSelect}
            >
              <option value="">—</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {selectedCanonical && (
        <>
          {!rows.length ? (
            <div className={styles.emptyState}>No data for this exercise yet</div>
          ) : (
            <>
              <TableCard>
                <Table>
                  <TableHeadRow>
                    {columns.map((col) => (
                      <TableCell
                        key={col.header}
                        as="th"
                        variant={col.variant ?? 'mono'}
                        className={col.headerClassName}
                      >
                        {col.header}
                      </TableCell>
                    ))}
                  </TableHeadRow>
                  <tbody>
                    {rows.map((row) => (
                      <TableRow key={row.lifterName}>
                        {columns.map((col) => (
                          <TableCell
                            key={col.header}
                            variant={col.variant ?? 'mono'}
                            className={clsx(
                              typeof col.cellClassName === 'function'
                                ? col.cellClassName(row)
                                : col.cellClassName
                            )}
                          >
                            {col.render(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </TableCard>
              {erroredLifterCount > 0 && (
                <p className={styles.errorNote}>
                  {erroredLifterCount} lifter{erroredLifterCount === 1 ? '' : 's'} could not be
                  loaded
                </p>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

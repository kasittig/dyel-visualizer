import clsx from 'clsx';
import { useCoachViewData } from './useCoachViewData';
import { useCoachViewSelection } from './useCoachViewSelection';
import {
  TypeaheadDropdown,
  TableCard,
  Table,
  TableHeadRow,
  TableRow,
  TableCell,
} from '../../shared/components';
import styles from './CoachViewPage.module.css';

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
  } = useCoachViewSelection(dataState.status === 'success' ? dataState.data : []);

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

      {selectedCanonical && (
        <>
          {!rows.length ? (
            <div className={styles.emptyState}>No data for this exercise yet</div>
          ) : (
            <>
              <TableCard>
                <Table>
                  <TableHeadRow>
                    <TableCell as="th" variant="mono">
                      Lifter
                    </TableCell>
                    <TableCell as="th" variant="mono">
                      Exercise
                    </TableCell>
                    <TableCell as="th" variant="mono">
                      Reps
                    </TableCell>
                    <TableCell as="th" variant="mono">
                      # Sessions
                    </TableCell>
                    <TableCell as="th" variant="mono" className={styles.columnDivider}>
                      Target weight
                    </TableCell>
                    <TableCell as="th" variant="mono">
                      Last performed
                    </TableCell>
                    <TableCell as="th" variant="mono">
                      e1RM
                    </TableCell>
                  </TableHeadRow>
                  <tbody>
                    {rows.map((row) => (
                      <TableRow key={row.lifterName}>
                        <TableCell variant="mono">{row.lifterName}</TableCell>
                        <TableCell variant="mono">
                          <TypeaheadDropdown
                            options={exerciseOptions}
                            value={row.effectiveDisplayName || null}
                            onChange={row.onExerciseChange}
                            placeholder="Search exercise..."
                          />
                        </TableCell>
                        <TableCell variant="mono">
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
                        </TableCell>
                        <TableCell
                          variant="mono"
                          className={clsx(!row.hasData && styles.placeholderCell)}
                        >
                          {row.sessionCount}
                        </TableCell>
                        <TableCell
                          variant="mono"
                          className={clsx(
                            styles.columnDivider,
                            !row.hasData && styles.placeholderCell
                          )}
                        >
                          {row.targetWeightDisplay}
                        </TableCell>
                        <TableCell
                          variant="mono"
                          className={clsx(!row.hasData && styles.placeholderCell)}
                        >
                          {row.lastPerformedDisplay}
                        </TableCell>
                        <TableCell
                          variant="mono"
                          className={clsx(!row.hasData && styles.placeholderCell)}
                        >
                          {row.e1rmDisplay}
                        </TableCell>
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

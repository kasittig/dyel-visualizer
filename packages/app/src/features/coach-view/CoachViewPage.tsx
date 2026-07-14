import clsx from 'clsx';
import { useCoachViewData } from './useCoachViewData';
import { useCoachViewSelection } from './useCoachViewSelection';
import { TypeaheadDropdown } from '../../shared/components';
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
              <table className={styles.table}>
                <thead>
                  <tr className={styles.thead}>
                    <th className={styles.cellMono}>Lifter</th>
                    <th className={clsx(styles.cellMono, styles.columnDivider)}>Target weight</th>
                    <th className={styles.cellMono}>Last performed</th>
                    <th className={styles.cellMono}>e1RM</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.lifterName} className={styles.bodyRow}>
                      <td className={styles.cellMono}>{row.lifterName}</td>
                      <td
                        className={clsx(
                          styles.cellMono,
                          styles.columnDivider,
                          !row.hasData && styles.placeholderCell
                        )}
                      >
                        {row.targetWeightDisplay}
                      </td>
                      <td
                        className={`${styles.cellMono} ${!row.hasData ? styles.placeholderCell : ''}`}
                      >
                        {row.lastPerformedDisplay}
                      </td>
                      <td
                        className={`${styles.cellMono} ${!row.hasData ? styles.placeholderCell : ''}`}
                      >
                        {row.e1rmDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

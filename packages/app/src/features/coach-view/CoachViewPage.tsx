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
    toggleUnit,
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
      <div className={styles.header}>
        <TypeaheadDropdown
          options={exerciseOptions}
          value={selectedDisplayName || null}
          onChange={setSelectedDisplayName}
          placeholder="Search exercise..."
        />
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
        <button className={styles.unitToggle} onClick={toggleUnit} type="button">
          {unit}
        </button>
      </div>

      {selectedCanonical && (
        <>
          <div className={styles.headerLine}>
            EXERCISE: {selectedDisplayName} # reps: {reps}
          </div>
          {!rows.length ? (
            <div className={styles.emptyState}>No data for this exercise yet</div>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.thead}>
                    <th className={styles.cellLeft}>Lifter</th>
                    <th className={styles.cellMono}>e1RM</th>
                    <th className={styles.cellLeft}>Last time performed</th>
                    <th className={styles.cellLeft}>Target weight</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.lifterName} className={styles.bodyRow}>
                      <td className={styles.cellLeft}>{row.lifterName}</td>
                      <td
                        className={`${styles.cellMono} ${!row.hasData ? styles.placeholderCell : ''}`}
                      >
                        {row.e1rmDisplay}
                      </td>
                      <td
                        className={`${styles.cellLeft} ${!row.hasData ? styles.placeholderCell : ''}`}
                      >
                        {row.lastPerformedDisplay}
                      </td>
                      <td
                        className={`${styles.cellLeft} ${!row.hasData ? styles.placeholderCell : ''}`}
                      >
                        {row.targetWeightDisplay}
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

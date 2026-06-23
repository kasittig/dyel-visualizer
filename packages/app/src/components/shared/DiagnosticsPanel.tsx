import { useMemo, type CSSProperties } from 'react';
import { generateDiagnostics } from '@dyel/core';
import type { DeadliftStancePreference } from '@dyel/core';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import styles from './DiagnosticsPanel.module.css';

function formatEffect(effect: string): string {
  return effect
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DiagnosticsPanel({
  rows,
  targetName,
  deadliftStance,
  onDeadliftStanceChange,
}: {
  rows: ConjugateDataPair[];
  targetName: string;
  onTargetChange: (name: string | null) => void;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
}) {
  const hasDeadlift = useMemo(() => rows.some(([ex]) => ex.type === 'deadlift'), [rows]);

  const results = useMemo(
    () => generateDiagnostics(rows, targetName, deadliftStance),
    [rows, targetName, deadliftStance]
  );

  const weakEffects = useMemo(
    () => [...new Set(results.filter((r) => r.status === 'weakness').flatMap((r) => r.effects))],
    [results]
  );
  const overtrainedEffects = useMemo(
    () => [
      ...new Set(results.filter((r) => r.status === 'overtrained').flatMap((r) => r.effects)),
    ],
    [results]
  );

  if (results.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <h2>Diagnostics</h2>
      {(weakEffects.length > 0 || overtrainedEffects.length > 0) && (
        <div className={styles.summary}>
          {weakEffects.length > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Weak spots:</span>
              {weakEffects.map((e) => (
                <span key={e} className={`${styles.chip} ${styles.chipDanger}`}>
                  {formatEffect(e)}
                </span>
              ))}
            </div>
          )}
          {overtrainedEffects.length > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Overworked:</span>
              {overtrainedEffects.map((e) => (
                <span key={e} className={`${styles.chip} ${styles.chipWarning}`}>
                  {formatEffect(e)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {hasDeadlift && (
        <div className={styles.stanceRow}>
          <span>Primary pull: </span>
          {(['conventional', 'sumo'] as const).map((s) => (
            <label key={s} className={styles.stanceLabel}>
              <input
                type="radio"
                name="deadlift-stance"
                checked={deadliftStance === s}
                onChange={() => onDeadliftStanceChange(s)}
                className={styles.stanceRadio}
              />
              {s[0].toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>
      )}
      {results.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr className={styles.thead}>
              <th className={styles.cellLeft}>Variation</th>
              <th className={styles.cellLeft}>Effects</th>
              <th className={styles.cellMono}>Avg Index</th>
              <th className={styles.cellMono}>Baseline Range</th>
              <th className={styles.cellLeft}>Diagnostic</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const { status } = r;
              const diagnosticColor =
                status === 'optimal'
                  ? 'var(--success)'
                  : status === 'overtrained'
                    ? 'var(--warning)'
                    : 'var(--danger)';
              const diagnosticLabel =
                status === 'optimal'
                  ? 'Optimal'
                  : status === 'overtrained'
                    ? 'Overtrained'
                    : 'Weakness';
              return (
                <tr key={r.displayName} className={styles.bodyRow}>
                  <td className={styles.cell}>{r.displayName}</td>
                  <td className={styles.cellText}>{r.effects.map(formatEffect).join(', ')}</td>
                  <td className={styles.cellMono}>{r.averageIndex?.toFixed(1) ?? '-'}%</td>
                  <td className={styles.cellMono}>{r.expectedBaseline}</td>
                  <td
                    className={styles.cellDiagnostic}
                    style={{ '--diagnostic-color': diagnosticColor } as CSSProperties}
                  >
                    {diagnosticLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

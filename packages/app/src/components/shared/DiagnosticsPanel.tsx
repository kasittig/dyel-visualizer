import { useMemo, useState, type CSSProperties } from 'react';
import { generateDiagnostics } from '@dyel/core';
import type { ConjugateExercise, DeadliftStancePreference, RepCalcStats } from '@dyel/core';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import styles from './DiagnosticsPanel.module.css';

function formatEffect(effect: string): string {
  return effect
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAddlWts(ex: ConjugateExercise): string | undefined {
  if (ex.addlWtOffset === undefined) {
    return undefined;
  }
  const label = ex.addlWts
    .map((w) =>
      w
        .split(' ')
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join(' ')
    )
    .join(' + ');
  const sign = ex.addlWtOffset >= 0 ? '+' : '-';
  return `${label}: ${sign}${Math.abs(ex.addlWtOffset).toFixed(1)}lbs`;
}

export function DiagnosticsPanel({
  rows,
  targetName,
  deadliftStance,
  onDeadliftStanceChange,
  onVariationClick,
  highlightedVariation,
  variantFactor,
  addlWtOffset,
}: {
  rows: ConjugateDataPair[];
  targetName: string;
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
  onVariationClick?: (name: string) => void;
  highlightedVariation?: string | null;
  variantFactor: RepCalcStats['variantFactor'];
  addlWtOffset: RepCalcStats['addlWtOffset'];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const hasDeadlift = useMemo(() => rows.some(([ex]) => ex.type === 'deadlift'), [rows]);

  const results = useMemo(
    () => generateDiagnostics(rows, targetName, { variantFactor, addlWtOffset }, deadliftStance),
    [rows, targetName, deadliftStance, variantFactor, addlWtOffset]
  );

  const { weakEffects, overtrainedEffects } = useMemo(() => {
    const counter = new Map<string, number>();
    for (const r of results) {
      if (r.status !== 'overtrained' && r.status !== 'weakness') {
        continue;
      }
      const delta = r.status === 'overtrained' ? 1 : -1;
      for (const e of r.effects) {
        counter.set(e, (counter.get(e) ?? 0) + delta);
      }
    }
    const weakEffects: string[] = [];
    const overtrainedEffects: string[] = [];
    for (const [e, count] of counter) {
      if (count < 0) {
        weakEffects.push(e);
      } else if (count > 0) {
        overtrainedEffects.push(e);
      }
    }
    return { weakEffects, overtrainedEffects };
  }, [results]);

  if (results.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <button className="tab-title" onClick={() => setIsExpanded((v) => !v)}>
        <span className="tab-title-toggle">{isExpanded ? '▾' : '▸'}</span>
        <span className="tab-title-label">Diagnostics</span>
      </button>
      {isExpanded && (
        <div className={styles.card}>
          <div className={styles.cardPadded}>
            {(weakEffects.length > 0 || overtrainedEffects.length > 0) && (
              <div className={styles.summary}>
                {weakEffects.length > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Weak spots:</span>
                    {weakEffects.map((e) => (
                      <span
                        key={e}
                        className={`${styles.chip} ${activeEffect === e ? styles.chipActive : styles.chipDanger}`}
                        onClick={() => setActiveEffect(activeEffect === e ? null : e)}
                        style={{ cursor: 'pointer' }}
                      >
                        {formatEffect(e)}
                      </span>
                    ))}
                  </div>
                )}
                {overtrainedEffects.length > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Overworked:</span>
                    {overtrainedEffects.map((e) => (
                      <span
                        key={e}
                        className={`${styles.chip} ${activeEffect === e ? styles.chipActive : styles.chipWarning}`}
                        onClick={() => setActiveEffect(activeEffect === e ? null : e)}
                        style={{ cursor: 'pointer' }}
                      >
                        {formatEffect(e)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {hasDeadlift && (
              <fieldset className={styles.stanceRow}>
                <legend className={styles.stanceLegend}>Primary pull</legend>
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
              </fieldset>
            )}
          </div>
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
                    <tr
                      key={r.displayName}
                      className={
                        r.displayName === highlightedVariation
                          ? `${styles.bodyRow} ${styles.bodyRowSelected}`
                          : styles.bodyRow
                      }
                      onClick={() => onVariationClick?.(r.displayName)}
                      style={{ cursor: onVariationClick ? 'pointer' : undefined }}
                    >
                      <td className={styles.cell}>{r.displayName}</td>
                      <td className={styles.cellText}>
                        {[
                          ...r.effects.map(formatEffect),
                          ...(r.addlWtOffset !== undefined ? [formatAddlWts(r)!] : []),
                        ].join(', ')}
                      </td>
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
      )}
    </div>
  );
}

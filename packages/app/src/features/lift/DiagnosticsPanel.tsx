import { useState, type CSSProperties } from 'react';
import type { DeadliftStancePreference } from '../../app/appTabs';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';
import { formatEffect, formatAddlWtOffset, type DisplayUnit } from '@dyel/api';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import styles from './DiagnosticsPanel.module.css';

export function DiagnosticsPanel({
  deadliftStance,
  onDeadliftStanceChange,
  onVariationClick,
  highlightedVariation,
  liftType,
  unit,
}: {
  deadliftStance: DeadliftStancePreference;
  onDeadliftStanceChange: (s: DeadliftStancePreference) => void;
  onVariationClick?: (name: string | null) => void;
  highlightedVariation?: string | null;
  liftType: string;
  unit: DisplayUnit;
}) {
  const [activeEffect, setActiveEffect] = useState<string | null>(null);

  const handleEffectClick = (e: string) => {
    setActiveEffect((prev) => (prev === e ? null : e));
    onVariationClick?.(null);
  };

  const {
    variants: results,
    hasDeadlift,
    weakEffects,
    overtrainedEffects,
  } = usePipelineDiagnostics(liftType);

  if (results.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <CollapsibleSection label="Diagnostics">
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
                        onClick={() => handleEffectClick(e)}
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
                        onClick={() => handleEffectClick(e)}
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
                      : status === 'overperforming'
                        ? 'var(--warning)'
                        : status === 'weakness'
                          ? 'var(--danger)'
                          : 'var(--muted)';
                  const diagnosticLabel =
                    status === 'optimal'
                      ? 'Optimal'
                      : status === 'overperforming'
                        ? 'Overtrained'
                        : status === 'weakness'
                          ? 'Weakness'
                          : 'Stale';
                  const isHighlighted =
                    r.displayName === highlightedVariation ||
                    (activeEffect !== null && r.effects.includes(activeEffect));
                  return (
                    <tr
                      key={r.displayName}
                      className={
                        isHighlighted
                          ? `${styles.bodyRow} ${styles.bodyRowSelected}`
                          : styles.bodyRow
                      }
                      onClick={() => {
                        setActiveEffect(null);
                        onVariationClick?.(r.displayName);
                      }}
                      style={{ cursor: onVariationClick ? 'pointer' : undefined }}
                    >
                      <td className={styles.cell}>{r.displayName}</td>
                      <td className={styles.cellText}>
                        {[
                          ...r.effects.map(formatEffect),
                          ...(r.addlWtOffset !== undefined
                            ? [formatAddlWtOffset(r.addlWtOffset.offsetKg, unit)]
                            : []),
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
      </CollapsibleSection>
    </div>
  );
}

import { useMemo, useState, type CSSProperties } from 'react';
import type { InputMode } from '../../utils/appUtils';
import { usePipelineDiagnostics } from '../../hooks/pipeline/usePipelineDiagnostics';
import { CollapsibleSection } from './CollapsibleSection';
import styles from './DiagnosticsPanel.module.css';

function formatEffect(effect: string): string {
  return effect
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DiagnosticsPanel({
  inputMode,
  url,
  pastedText,
  refreshToken,
  deadliftStance,
  onDeadliftStanceChange,
  onVariationClick,
  highlightedVariation,
}: {
  inputMode: InputMode;
  url: string;
  pastedText: string;
  refreshToken: number;
  deadliftStance: 'sumo' | 'conventional';
  onDeadliftStanceChange: (s: 'sumo' | 'conventional') => void;
  onVariationClick?: (name: string | null) => void;
  highlightedVariation?: string | null;
}) {
  const [activeEffect, setActiveEffect] = useState<string | null>(null);

  const handleEffectClick = (e: string) => {
    setActiveEffect((prev) => (prev === e ? null : e));
    onVariationClick?.(null);
  };

  const { variants, hasDeadlift } = usePipelineDiagnostics(
    inputMode,
    url,
    pastedText,
    refreshToken,
    deadliftStance
  );

  const { weakEffects, overtrainedEffects } = useMemo(() => {
    const counter = new Map<string, number>();
    for (const v of variants) {
      if (v.status !== 'overperforming' && v.status !== 'weakness') {
        continue;
      }
      const delta = v.status === 'overperforming' ? 1 : -1;
      for (const e of v.effects) {
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
  }, [variants]);

  if (variants.length === 0) {
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
          {variants.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr className={styles.thead}>
                  <th className={styles.cellLeft}>Variation</th>
                  <th className={styles.cellLeft}>Effects</th>
                  <th className={styles.cellMono}>Ratio</th>
                  <th className={styles.cellLeft}>Diagnostic</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const { status } = v;
                  const diagnosticColor =
                    status === 'optimal'
                      ? 'var(--success)'
                      : status === 'overperforming'
                        ? 'var(--warning)'
                        : 'var(--danger)';
                  const diagnosticLabel =
                    status === 'optimal'
                      ? 'Optimal'
                      : status === 'overperforming'
                        ? 'Overtrained'
                        : 'Weakness';
                  const isHighlighted =
                    v.canonical === highlightedVariation ||
                    (activeEffect !== null && v.effects.includes(activeEffect));
                  return (
                    <tr
                      key={v.canonical}
                      className={
                        isHighlighted
                          ? `${styles.bodyRow} ${styles.bodyRowSelected}`
                          : styles.bodyRow
                      }
                      onClick={() => {
                        setActiveEffect(null);
                        onVariationClick?.(v.canonical);
                      }}
                      style={{ cursor: onVariationClick ? 'pointer' : undefined }}
                    >
                      <td className={styles.cell}>{v.canonical}</td>
                      <td className={styles.cellText}>{v.effects.map(formatEffect).join(', ')}</td>
                      <td className={styles.cellMono}>{(v.ratio * 100).toFixed(1)}%</td>
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

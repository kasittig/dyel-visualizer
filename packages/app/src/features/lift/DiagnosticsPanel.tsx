import { useState, type CSSProperties } from 'react';
import { usePipelineDiagnostics, type DiagnosticRow } from './usePipelineDiagnostics';
import { formatEffect } from '@dyel/api/display';
import type { DisplayUnit, DiagnosticVariant } from '@dyel/api';
import { CollapsibleSection, TableCard } from '../../shared/components';
import { useSortableRows } from '../../shared/hooks';
import styles from './DiagnosticsPanel.module.css';

const LABELS = {
  optimal: ['In range', 'var(--success)'],
  overperforming: ['Above range', 'var(--warning)'],
  weakness: ['Below range', 'var(--danger)'],
  stale: ['Needs retest', 'var(--muted)'],
} satisfies Record<DiagnosticVariant['status'], readonly [string, string]>;

type SortColumn = 'variation' | 'effects' | 'evidence' | 'diagnostic';

export function DiagnosticsPanel({
  onVariationClick,
  highlightedVariation,
  liftType,
  unit,
}: {
  onVariationClick?: (name: string | null) => void;
  highlightedVariation?: string | null;
  liftType: string;
  unit: DisplayUnit;
}) {
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const { variants, weakEffects, overtrainedEffects } = usePipelineDiagnostics(liftType, unit);
  const rows = variants;
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<DiagnosticRow, SortColumn>(
    rows,
    {
      variation: (r) => r.displayName,
      effects: (r) => r.effectsDisplay,
      evidence: (r) => r.deltaPercent,
      diagnostic: (r) => LABELS[r.status][0],
    },
    (r) => r.displayName
  );

  if (variants.length === 0) {
    return null;
  }

  const handleEffectClick = (e: string) => {
    setActiveEffect((prev) => (prev === e ? null : e));
    onVariationClick?.(null);
  };

  return (
    <div className={styles.wrapper}>
      <CollapsibleSection
        label="Diagnostics"
        persistenceId={`visualizer:${liftType}:diagnostics`}
        summary={`${variants.length} variation${variants.length === 1 ? '' : 's'} · ${weakEffects.length} below range · ${overtrainedEffects.length} above range`}
      >
        <TableCard>
          <div className={styles.cardPadded}>
            {(weakEffects.length > 0 || overtrainedEffects.length > 0) && (
              <div className={styles.summary}>
                {weakEffects.length > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Effects on below-range variations:</span>
                    {weakEffects.map((e) => (
                      <button
                        type="button"
                        key={e}
                        className={`${styles.chip} ${activeEffect === e ? styles.chipActive : styles.chipDanger}`}
                        onClick={() => handleEffectClick(e)}
                        aria-pressed={activeEffect === e}
                      >
                        {formatEffect(e)}
                      </button>
                    ))}
                  </div>
                )}
                {overtrainedEffects.length > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Effects on above-range variations:</span>
                    {overtrainedEffects.map((e) => (
                      <button
                        type="button"
                        key={e}
                        className={`${styles.chip} ${activeEffect === e ? styles.chipActive : styles.chipWarning}`}
                        onClick={() => handleEffectClick(e)}
                        aria-pressed={activeEffect === e}
                      >
                        {formatEffect(e)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className={styles.sortBar} aria-label="Sort diagnostics">
            <span>Sort by</span>
            {(
              [
                ['diagnostic', 'Status'],
                ['evidence', 'Difference'],
                ['variation', 'Variation'],
              ] as const
            ).map(([column, label]) => (
              <button
                type="button"
                key={column}
                className={`${styles.sortButton} ${sortKey === column ? styles.sortButtonActive : ''}`}
                onClick={() => toggleSort(column)}
              >
                {label}
                {sortKey === column && (
                  <span aria-hidden="true"> {direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>
          <div className={styles.findings} role="list">
            {sortedRows.map((r) => {
              const [lbl, color] = LABELS[r.status];
              const isHigh =
                r.displayName === highlightedVariation ||
                (activeEffect !== null && r.effects.includes(activeEffect));
              return (
                <button
                  type="button"
                  role="listitem"
                  key={r.displayName}
                  className={`${styles.finding} ${isHigh ? styles.findingSelected : ''}`}
                  onClick={() => {
                    setActiveEffect(null);
                    onVariationClick?.(r.displayName);
                  }}
                  style={{ '--diagnostic-color': color } as CSSProperties}
                >
                  <span className={styles.findingHeader}>
                    <span className={styles.variationName}>
                      {r.displayName}
                      {r.isCompLift && (
                        <span className={styles.compBadge} title="Competition variant">
                          🏆
                        </span>
                      )}
                    </span>
                    <span className={styles.status}>{lbl}</span>
                  </span>
                  <span className={styles.comparison}>
                    <span className={styles.actual}>{r.actualE1rmDisplay}</span>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                    <span className={styles.expected}>
                      <small>expected</small>
                      {r.expectedE1rmDisplay}
                    </span>
                    <span className={styles.delta}>
                      {r.deltaPercent === 0
                        ? `${r.deltaDisplay} at expectation`
                        : `${r.deltaDisplay} ${r.deltaPercent > 0 ? 'above' : 'below'}`}
                    </span>
                  </span>
                  <span className={styles.findingFooter}>
                    <span className={styles.effects}>{r.effectsDisplay}</span>
                    <span className={styles.recency}>
                      Tested {r.ageDisplay === 'Today' ? 'today' : r.ageDisplay}
                      {r.status === 'stale' && <strong> · Retest recommended</strong>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </TableCard>
      </CollapsibleSection>
    </div>
  );
}

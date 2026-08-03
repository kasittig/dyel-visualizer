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
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(() => new Set());
  const { variants, weakEffects, overtrainedEffects } = usePipelineDiagnostics(liftType, unit);
  const rows = variants;
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<DiagnosticRow, SortColumn>(
    rows,
    {
      variation: (r) => r.displayName,
      effects: (r) => r.effectsDisplay,
      evidence: (r) => r.averageIndex,
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

  const toggleRow = (canonical: string) => {
    setCollapsedRows((current) => {
      const next = new Set(current);
      if (next.has(canonical)) {
        next.delete(canonical);
      } else {
        next.add(canonical);
      }
      return next;
    });
  };

  return (
    <div className={styles.wrapper}>
      <CollapsibleSection
        label="Diagnostics"
        persistenceId={`visualizer:${liftType}:diagnostics`}
        summary={`${variants.length} variation${variants.length === 1 ? '' : 's'} · ${weakEffects.length} below range · ${overtrainedEffects.length} above range`}
      >
        <TableCard>
          {(weakEffects.length > 0 || overtrainedEffects.length > 0) && (
            <div className={styles.cardPadded}>
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
            </div>
          )}
          <div className={styles.sortBar} aria-label="Sort diagnostics">
            <span>Sort by</span>
            {(
              [
                ['diagnostic', 'Status'],
                ['evidence', 'Index'],
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
              const isCollapsed = collapsedRows.has(r.canonical);
              const detailId = `diagnostic-${r.canonical}-details`;
              const isHigh =
                r.displayName === highlightedVariation ||
                (activeEffect !== null && r.effects.includes(activeEffect));
              return (
                <div
                  role="listitem"
                  key={r.displayName}
                  className={`${styles.finding} ${isHigh ? styles.findingSelected : ''}`}
                  style={{ '--diagnostic-color': color } as CSSProperties}
                >
                  <button
                    type="button"
                    className={styles.findingToggle}
                    aria-expanded={!isCollapsed}
                    aria-controls={detailId}
                    aria-label={`${r.displayName}: ${lbl}. ${isCollapsed ? 'Expand' : 'Collapse'} diagnostic`}
                    onClick={() => toggleRow(r.canonical)}
                  >
                    <span className={styles.variationName}>
                      {r.displayName}
                      {r.isCompLift && (
                        <span className={styles.compBadge} title="Competition variant">
                          🏆
                        </span>
                      )}
                    </span>
                    <span className={styles.status}>{lbl}</span>
                    <span className={styles.collapseIcon} aria-hidden="true">
                      {isCollapsed ? '＋' : '−'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <button
                      type="button"
                      id={detailId}
                      className={styles.findingDetails}
                      onClick={() => {
                        setActiveEffect(null);
                        onVariationClick?.(r.displayName);
                      }}
                    >
                      <span className={styles.comparison}>
                        <span className={styles.actual}>
                          {r.expectedBaseline ? `${r.averageIndex.toFixed(1)}%` : r.deltaDisplay}
                          <small>{r.expectedBaseline ? 'strength index' : 'vs fitted trend'}</small>
                        </span>
                        <span className={styles.arrow} aria-hidden="true">
                          →
                        </span>
                        <span className={styles.expected}>
                          {r.expectedBaseline ?? 'within ±5%'}
                          <small>{r.expectedBaseline ? 'target range' : 'target'}</small>
                        </span>
                      </span>
                      <span className={styles.findingFooter}>
                        <span className={styles.effects}>{r.effectsDisplay}</span>
                        <span className={styles.recency}>
                          Latest e1RM {r.actualE1rmDisplay} · Tested{' '}
                          {r.ageDisplay === 'Today' ? 'today' : r.ageDisplay}
                          {r.status === 'stale' && <strong> · Retest recommended</strong>}
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </TableCard>
      </CollapsibleSection>
    </div>
  );
}

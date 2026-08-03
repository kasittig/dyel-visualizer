import { useState, type CSSProperties } from 'react';
import { usePipelineDiagnostics, type DiagnosticRow } from './usePipelineDiagnostics';
import { formatEffect } from '@dyel/api/display';
import type { DisplayUnit, DiagnosticVariant } from '@dyel/api';
import {
  CollapsibleSection,
  TableCard,
  Table,
  TableHeadRow,
  TableRow,
  TableCell,
} from '../../shared/components';
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

  const headerSort = (column: SortColumn) => ({
    onSort: () => toggleSort(column),
    sortDirection: sortKey === column ? direction : null,
  });

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
          <Table>
            <TableHeadRow>
              <TableCell as="th" variant="left" {...headerSort('variation')}>
                Variation
              </TableCell>
              <TableCell as="th" variant="left" {...headerSort('effects')}>
                Effects
              </TableCell>
              <TableCell as="th" variant="mono" {...headerSort('evidence')}>
                Latest e1RM vs expected
              </TableCell>
              <TableCell as="th" variant="left" {...headerSort('diagnostic')}>
                Diagnostic
              </TableCell>
            </TableHeadRow>
            <tbody>
              {sortedRows.map((r) => {
                const [lbl, color] = LABELS[r.status];
                const isHigh =
                  r.displayName === highlightedVariation ||
                  (activeEffect !== null && r.effects.includes(activeEffect));
                return (
                  <TableRow
                    key={r.displayName}
                    selected={isHigh}
                    onClick={() => {
                      setActiveEffect(null);
                      onVariationClick?.(r.displayName);
                    }}
                  >
                    <TableCell>
                      {r.displayName}
                      {r.isCompLift && (
                        <span className={styles.compBadge} title="Competition variant">
                          🏆
                        </span>
                      )}
                    </TableCell>
                    <TableCell variant="text">{r.effectsDisplay}</TableCell>
                    <TableCell variant="mono" className={styles.evidence}>
                      <span className={styles.evidenceValues}>
                        {r.actualE1rmDisplay} vs {r.expectedE1rmDisplay} expected
                      </span>
                      <span className={styles.evidenceContext}>
                        {r.deltaPercent === 0
                          ? `${r.deltaDisplay} at expectation`
                          : `${r.deltaDisplay} ${r.deltaPercent > 0 ? 'above' : 'below'} expectation`}
                        {' · '}
                        Tested {r.ageDisplay === 'Today' ? 'today' : r.ageDisplay}
                        {r.status === 'stale' && (
                          <strong className={styles.retest}> · Retest recommended</strong>
                        )}
                      </span>
                    </TableCell>
                    <TableCell
                      variant="diagnostic"
                      style={{ '--diagnostic-color': color } as CSSProperties}
                    >
                      {lbl}
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </TableCard>
      </CollapsibleSection>
    </div>
  );
}

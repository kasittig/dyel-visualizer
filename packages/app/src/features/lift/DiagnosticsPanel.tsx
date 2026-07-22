import { useState, type CSSProperties } from 'react';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';
import {
  formatEffect,
  formatAddlWtOffset,
  type DisplayUnit,
  type DiagnosticVariant,
} from '@dyel/api';
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
  optimal: ['Optimal', 'var(--success)'],
  overperforming: ['Overtrained', 'var(--warning)'],
  weakness: ['Weakness', 'var(--danger)'],
  stale: ['Stale', 'var(--muted)'],
};

type SortColumn = 'variation' | 'effects' | 'averageIndex' | 'expectedBaseline' | 'diagnostic';

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
  const { variants, weakEffects, overtrainedEffects } = usePipelineDiagnostics(liftType);
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<
    DiagnosticVariant,
    SortColumn
  >(
    variants,
    {
      variation: (r) => r.displayName,
      effects: (r) =>
        [
          ...r.effects.map(formatEffect),
          ...(r.addlWtOffset !== undefined
            ? [formatAddlWtOffset(r.addlWtOffset.offsetKg, unit)]
            : []),
        ].join(', '),
      averageIndex: (r) => r.averageIndex ?? -Infinity,
      expectedBaseline: (r) => r.expectedBaseline ?? '',
      diagnostic: (r) => (LABELS[r.status as keyof typeof LABELS] ?? ['Stale'])[0] as string,
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
      <CollapsibleSection label="Diagnostics">
        <TableCard>
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
          </div>
          <Table>
            <TableHeadRow>
              <TableCell as="th" variant="left" {...headerSort('variation')}>
                Variation
              </TableCell>
              <TableCell as="th" variant="left" {...headerSort('effects')}>
                Effects
              </TableCell>
              <TableCell as="th" variant="mono" {...headerSort('averageIndex')}>
                Avg Index
              </TableCell>
              <TableCell as="th" variant="mono" {...headerSort('expectedBaseline')}>
                Baseline Range
              </TableCell>
              <TableCell as="th" variant="left" {...headerSort('diagnostic')}>
                Diagnostic
              </TableCell>
            </TableHeadRow>
            <tbody>
              {sortedRows.map((r) => {
                const [lbl, color] = LABELS[r.status as keyof typeof LABELS] ?? [
                  'Stale',
                  'var(--muted)',
                ];
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
                    <TableCell variant="text">
                      {[
                        ...r.effects.map(formatEffect),
                        ...(r.addlWtOffset !== undefined
                          ? [formatAddlWtOffset(r.addlWtOffset.offsetKg, unit)]
                          : []),
                      ].join(', ')}
                    </TableCell>
                    <TableCell variant="mono">{r.averageIndex?.toFixed(1) ?? '-'}%</TableCell>
                    <TableCell variant="mono">{r.expectedBaseline}</TableCell>
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

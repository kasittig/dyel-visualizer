import { useMemo, useState, type CSSProperties } from 'react';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';
import { formatEffect, formatAddlWtOffset } from '@dyel/api/display';
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
  stale: ['Outdated', 'var(--muted)'],
} satisfies Record<DiagnosticVariant['status'], readonly [string, string]>;

type DiagnosticRow = DiagnosticVariant & { formattedEffects: string };

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
  const { variants, weakEffects, overtrainedEffects } = usePipelineDiagnostics(liftType);
  const rows = useMemo(
    () =>
      variants.map((variant) => ({
        ...variant,
        formattedEffects: [
          ...variant.effects.map(formatEffect),
          ...(variant.addlWtOffset !== undefined
            ? [formatAddlWtOffset(variant.addlWtOffset.offsetKg, unit)]
            : []),
        ].join(', '),
      })),
    [variants, unit]
  );
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<DiagnosticRow, SortColumn>(
    rows,
    {
      variation: (r) => r.displayName,
      effects: (r) => r.formattedEffects,
      evidence: (r) => r.averageIndex ?? -Infinity,
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
        summary={`${variants.length} variation${variants.length === 1 ? '' : 's'} · ${weakEffects.length} weak · ${overtrainedEffects.length} overtrained`}
      >
        <TableCard>
          <div className={styles.cardPadded}>
            {(weakEffects.length > 0 || overtrainedEffects.length > 0) && (
              <div className={styles.summary}>
                {weakEffects.length > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Below-range effects:</span>
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
                    <span className={styles.summaryLabel}>Above-range effects:</span>
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
              <TableCell as="th" variant="mono" {...headerSort('evidence')}>
                Performance (expected)
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
                    <TableCell variant="text">{r.formattedEffects}</TableCell>
                    <TableCell variant="mono" className={styles.evidence}>
                      <span>{r.averageIndex?.toFixed(1) ?? '-'}%</span>{' '}
                      <span>({r.expectedBaseline ?? 'range unavailable'})</span>
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

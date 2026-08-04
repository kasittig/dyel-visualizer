import type { AccessoryTableDisplay, AccessoryTableGroup } from './useAccessoryTable';
import { useSortableRows } from '../../shared/hooks';
import {
  CollapsibleSection,
  TableCard,
  Table,
  TableHeadRow,
  TableRow,
  TableCell,
} from '../../shared/components';
import styles from './AccessoryTable.module.css';

interface AccessoryTableProps {
  groups: AccessoryTableGroup[];
  hasSessionsInRange: boolean;
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}

type SortCol =
  | 'label'
  | 'effects'
  | 'progress'
  | 'lastPerformed'
  | 'sessionCountInRange'
  | 'sessionCount';

function SubtypeTable({
  label,
  persistenceId,
  rows,
  inRangeHeader,
  highlightedVariation,
  onVariationClick,
}: {
  label: string;
  persistenceId: string;
  rows: AccessoryTableDisplay[];
  inRangeHeader: string;
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}) {
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<
    AccessoryTableDisplay,
    SortCol
  >(
    rows,
    {
      label: (r) => r.label,
      effects: (r) => r.effectsDisplay,
      progress: (r) => r.progressDisplay,
      lastPerformed: (r) => r.lastSession.date,
      sessionCountInRange: (r) => r.sessionCountInRange,
      sessionCount: (r) => r.sessionCount,
    },
    (r) => r.label
  );

  const sortProps = (col: SortCol) => ({
    onSort: () => toggleSort(col),
    sortDirection: sortKey === col ? direction : null,
  });

  return (
    <CollapsibleSection
      persistenceId={persistenceId}
      label={label}
      summary={`${rows.length} exercise${rows.length === 1 ? '' : 's'} · ${rows.reduce((total, row) => total + row.sessionCountInRange, 0)} sessions in range`}
    >
      <TableCard>
        <Table>
          <TableHeadRow>
            <TableCell as="th" variant="left" {...sortProps('label')}>
              Exercise
            </TableCell>
            <TableCell as="th" className={styles.effectsHeader} {...sortProps('effects')}>
              Effects
            </TableCell>
            <TableCell as="th" {...sortProps('progress')}>
              Progress (all time)
            </TableCell>
            <TableCell as="th" {...sortProps('lastPerformed')}>
              Last performed
            </TableCell>
            <TableCell as="th" {...sortProps('sessionCountInRange')}>
              {inRangeHeader}
            </TableCell>
            <TableCell as="th" {...sortProps('sessionCount')}>
              All Time
            </TableCell>
          </TableHeadRow>
          <tbody>
            {sortedRows.map(
              ({
                id,
                label: rLabel,
                effectsDisplay,
                progressDisplay,
                progressDetailDisplay,
                lastPerformedDisplay,
                sessionCount,
                sessionCountInRange,
              }) => (
                <TableRow
                  key={rLabel}
                  selected={id === highlightedVariation}
                  onClick={() => onVariationClick?.(id)}
                >
                  <TableCell variant="left">{rLabel}</TableCell>
                  <TableCell>{effectsDisplay}</TableCell>
                  <TableCell>
                    <span className={styles.progress}>{progressDisplay}</span>
                    <span className={styles.progressDetail}>{progressDetailDisplay}</span>
                  </TableCell>
                  <TableCell>{lastPerformedDisplay}</TableCell>
                  <TableCell>{sessionCountInRange}</TableCell>
                  <TableCell>{sessionCount}</TableCell>
                </TableRow>
              )
            )}
          </tbody>
        </Table>
      </TableCard>
    </CollapsibleSection>
  );
}

export function AccessoryTable({
  groups,
  hasSessionsInRange,
  highlightedVariation,
  onVariationClick,
}: AccessoryTableProps) {
  if (!groups.length) {
    return (
      <div className={styles.emptyState}>
        No accessory work is available in this training period. Adjust the date range or log an
        accessory exercise to build your inventory.
      </div>
    );
  }

  return (
    <>
      {!hasSessionsInRange && (
        <div className={styles.emptyState}>
          No accessory work was logged in this training period. Adjust the date range to review
          recent sessions; your all-time inventory remains available below.
        </div>
      )}
      {groups.map(({ subtype, label, rows }) => (
        <SubtypeTable
          key={subtype ?? 'null'}
          label={label}
          persistenceId={`visualizer:accessory:table:${subtype ?? 'uncategorized'}`}
          rows={rows}
          inRangeHeader="Sessions (in range)"
          highlightedVariation={highlightedVariation}
          onVariationClick={onVariationClick}
        />
      ))}
    </>
  );
}

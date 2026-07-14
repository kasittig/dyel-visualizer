import type { DateRange } from 'react-day-picker';
import type { DisplayUnit } from '@dyel/api';
import { useAccessoryTable, type AccessoryTableDisplay } from './useAccessoryTable';
import {
  CollapsibleSection,
  TableCard,
  Table,
  TableHeadRow,
  TableRow,
  TableCell,
} from '../../shared/components';
import { useSortableRows } from '../../shared/hooks';
import { shortDate } from '../../shared/dateUtils';
import styles from './AccessoryTable.module.css';

interface AccessoryTableProps {
  unit: DisplayUnit;
  dateRange?: DateRange;
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}

type SortColumn = 'label' | 'lastPerformed' | 'sessionCountInRange' | 'sessionCount';

function AccessorySubtypeTable({
  label,
  rows,
  inRangeHeader,
  highlightedVariation,
  onVariationClick,
}: {
  label: string;
  rows: AccessoryTableDisplay[];
  inRangeHeader: string;
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}) {
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<
    AccessoryTableDisplay,
    SortColumn
  >(rows, {
    label: (r) => r.label,
    lastPerformed: (r) => r.lastSession.date,
    sessionCountInRange: (r) => r.sessionCountInRange,
    sessionCount: (r) => r.sessionCount,
  });

  const headerSort = (column: SortColumn) => ({
    onSort: () => toggleSort(column),
    sortDirection: sortKey === column ? direction : null,
  });

  return (
    <CollapsibleSection label={label}>
      <TableCard>
        <Table>
          <TableHeadRow>
            <TableCell as="th" variant="left" {...headerSort('label')}>
              Exercise
            </TableCell>
            <TableCell as="th" {...headerSort('lastPerformed')}>
              Last performed
            </TableCell>
            <TableCell as="th" {...headerSort('sessionCountInRange')}>
              {inRangeHeader}
            </TableCell>
            <TableCell as="th" {...headerSort('sessionCount')}>
              All Time
            </TableCell>
          </TableHeadRow>
          <tbody>
            {sortedRows.map(
              ({ label: rowLabel, lastPerformedDisplay, sessionCount, sessionCountInRange }) => (
                <TableRow
                  key={rowLabel}
                  selected={rowLabel === highlightedVariation}
                  onClick={() => onVariationClick?.(rowLabel)}
                >
                  <TableCell variant="left">{rowLabel}</TableCell>
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
  unit,
  dateRange,
  highlightedVariation,
  onVariationClick,
}: AccessoryTableProps) {
  const groups = useAccessoryTable(unit, dateRange);

  if (groups.length === 0) {
    return <div className={styles.emptyState}>No accessory data logged yet</div>;
  }

  const inRangeHeader =
    dateRange?.from && dateRange?.to
      ? `${shortDate(dateRange.from)} - ${shortDate(dateRange.to)}`
      : 'Sessions (in range)';

  return (
    <>
      {groups.map(({ subtype, label, rows }) => (
        <AccessorySubtypeTable
          key={subtype ?? 'null'}
          label={label}
          rows={rows}
          inRangeHeader={inRangeHeader}
          highlightedVariation={highlightedVariation}
          onVariationClick={onVariationClick}
        />
      ))}
    </>
  );
}

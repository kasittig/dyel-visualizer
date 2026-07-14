import type { DateRange } from 'react-day-picker';
import type { DisplayUnit } from '@dyel/api';
import { useAccessoryTable } from './useAccessoryTable';
import type { AccessoryTableDisplay } from './useAccessoryTable';
import { useSortableRows } from '../../shared/hooks';
import { shortDate } from '../../shared/dateUtils';
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
  unit: DisplayUnit;
  dateRange?: DateRange;
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}

type SortCol = 'label' | 'lastPerformed' | 'sessionCountInRange' | 'sessionCount';

function SubtypeTable({
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
    SortCol
  >(rows, {
    label: (r) => r.label,
    lastPerformed: (r) => r.lastSession.date,
    sessionCountInRange: (r) => r.sessionCountInRange,
    sessionCount: (r) => r.sessionCount,
  });

  const sortProps = (col: SortCol) => ({
    onSort: () => toggleSort(col),
    sortDirection: sortKey === col ? direction : null,
  });

  return (
    <CollapsibleSection label={label}>
      <TableCard>
        <Table>
          <TableHeadRow>
            <TableCell as="th" variant="left" {...sortProps('label')}>
              Exercise
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
              ({ label: rLabel, lastPerformedDisplay, sessionCount, sessionCountInRange }) => (
                <TableRow
                  key={rLabel}
                  selected={rLabel === highlightedVariation}
                  onClick={() => onVariationClick?.(rLabel)}
                >
                  <TableCell variant="left">{rLabel}</TableCell>
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

  if (!groups.length) {
    return <div className={styles.emptyState}>No accessory data logged yet</div>;
  }

  const rangeHeader =
    dateRange?.from && dateRange?.to
      ? `${shortDate(dateRange.from)} - ${shortDate(dateRange.to)}`
      : 'Sessions (in range)';

  return (
    <>
      {groups.map(({ subtype, label, rows }) => (
        <SubtypeTable
          key={subtype ?? 'null'}
          label={label}
          rows={rows}
          inRangeHeader={rangeHeader}
          highlightedVariation={highlightedVariation}
          onVariationClick={onVariationClick}
        />
      ))}
    </>
  );
}

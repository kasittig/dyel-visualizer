import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTeamViewData } from '../team-view';
import { useTeamSummaryData } from './useTeamSummaryData';
import type { TeamSummaryRow } from './useTeamSummaryData';
import { useSortableRows } from '../../shared/hooks';
import {
  EditableDateChip,
  TableCard,
  Table,
  TableHeadRow,
  TableRow,
  TableCell,
} from '../../shared/components';
import styles from './TeamSummaryPage.module.css';

interface TeamViewColumn {
  header: string;
  headerClassName?: string;
  cellClassName?: string | ((row: TeamSummaryRow) => string | boolean | undefined);
  variant?: 'left' | 'mono';
  render: (row: TeamSummaryRow) => ReactNode;
  sortValue?: (row: TeamSummaryRow) => string | number;
}

export function TeamSummaryPage() {
  const dataState = useTeamViewData();
  const { rows, erroredLifterCount, unit, setUnit, dateRange, setDateRange } = useTeamSummaryData(
    dataState.status === 'success' ? dataState.data : []
  );

  const columns: TeamViewColumn[] = [
    {
      header: 'Lifter',
      variant: 'left',
      headerClassName: styles.lifterHeaderCell,
      cellClassName: () => clsx(styles.cellTint, styles.lifterCell),
      sortValue: (row) => row.lifterName,
      render: (row) => (
        <span title={row.lifterName}>
          {row.lifterName}
          {row.url && (
            <a
              href={`./?sheet=${encodeURIComponent(row.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.lifterLink}
              title={`Open ${row.lifterName} in DYEL Visualizer`}
            >
              ↗
            </a>
          )}
        </span>
      ),
    },
    {
      header: 'Squat',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.squat ?? 0,
      render: (row) => row.squatDisplay,
    },
    {
      header: 'Bench',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.bench ?? 0,
      render: (row) => row.benchDisplay,
    },
    {
      header: 'Deadlift',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.deadlift ?? 0,
      render: (row) => row.deadliftDisplay,
    },
    {
      header: 'Total',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.total ?? 0,
      render: (row) => row.totalDisplay,
    },
    {
      header: 'Sessions',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.sessionCount,
      render: (row) => row.sessionCount,
    },
    {
      header: 'Last set',
      headerClassName: styles.headerNowrap,
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.lastSetDisplay,
      render: (row) => row.lastSetDisplay,
    },
    {
      header: 'Date',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.dateDisplay,
      render: (row) => row.dateDisplay,
    },
  ];

  const sortableColumns = columns.filter(
    (c): c is TeamViewColumn & { sortValue: (row: TeamSummaryRow) => string | number } =>
      !!c.sortValue
  );
  const sortAccessors = Object.fromEntries(
    sortableColumns.map((c) => [c.header, c.sortValue])
  ) as Record<string, (row: TeamSummaryRow) => string | number>;
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<TeamSummaryRow, string>(
    rows,
    sortAccessors,
    (row) => row.lifterName
  );

  const sortProps = (col: TeamViewColumn) =>
    col.sortValue
      ? {
          onSort: () => toggleSort(col.header),
          sortDirection: sortKey === col.header ? direction : null,
        }
      : {};

  if (dataState.status === 'loading') {
    return (
      <main className={styles.main}>
        <p>Loading lifters...</p>
      </main>
    );
  }

  if (dataState.status === 'error') {
    return (
      <main className={styles.main}>
        <p className={styles.errorMsg}>{dataState.message}</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <p className={styles.backLink}>
        <a href="." className={styles.accentLink}>
          ← Back to DYEL Visualizer
        </a>
      </p>
      <div className={styles.teamViewPage}>🏆 Team Summary</div>
      <div className={styles.header}>
        <div className={styles.chipGroup}>
          {(['lbs', 'kg'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={clsx(styles.chip, unit === u && styles.chipActive)}
            >
              {u}
            </button>
          ))}
        </div>
        <EditableDateChip dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {rows.length === 0 ? (
        <div className={styles.emptyState}>No lifters available</div>
      ) : (
        <>
          <TableCard>
            <Table>
              <TableHeadRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.header}
                    as="th"
                    variant={col.variant ?? 'mono'}
                    className={col.headerClassName}
                    {...sortProps(col)}
                  >
                    {col.header}
                  </TableCell>
                ))}
              </TableHeadRow>
              <tbody>
                {sortedRows.map((row) => (
                  <TableRow key={row.lifterName}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.header}
                        variant={col.variant ?? 'mono'}
                        className={clsx(
                          typeof col.cellClassName === 'function'
                            ? col.cellClassName(row)
                            : col.cellClassName
                        )}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </TableCard>
          {erroredLifterCount > 0 && (
            <p className={styles.errorNote}>
              {erroredLifterCount} lifter{erroredLifterCount === 1 ? '' : 's'} could not be loaded
            </p>
          )}
        </>
      )}
    </main>
  );
}

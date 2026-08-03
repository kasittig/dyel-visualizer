import clsx from 'clsx';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { useTeamViewData } from '../team-view';
import { useTeamSummaryData } from './useTeamSummaryData';
import type { TeamSummaryRow } from './useTeamSummaryData';
import { MOBILE_LAYOUT_QUERY, useMediaQuery, useSortableRows } from '../../shared/hooks';
import { siteRootPath } from '../../shared/pageRouting';
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

function MobileSummaryCard({
  row,
  expanded,
  onToggle,
}: {
  row: TeamSummaryRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailsId = useId();

  return (
    <article className={styles.summaryCard}>
      <button
        type="button"
        className={styles.cardHeader}
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={`${expanded ? 'Hide' : 'Show'} details for ${row.lifterName}`}
        onClick={onToggle}
      >
        <span>
          <strong>{row.lifterName}</strong>
          <small>
            {row.dateDisplay === '—' ? 'No recent session' : `Last trained ${row.dateDisplay}`}
          </small>
        </span>
        <span className={styles.cardTotal}>
          <small>Total</small>
          <strong>{row.totalDisplay}</strong>
        </span>
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div id={detailsId} className={styles.cardDetails}>
          {[
            ['Squat', row.squatDisplay],
            ['Bench', row.benchDisplay],
            ['Deadlift', row.deadliftDisplay],
            ['Sessions', String(row.sessionCount)],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
          <div className={styles.lastSet}>
            <small>Last set</small>
            <strong>{row.lastSetDisplay}</strong>
          </div>
          {row.url && (
            <a
              href={`${siteRootPath()}?sheet=${encodeURIComponent(row.url)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open lifter ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
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
              href={`${siteRootPath()}?sheet=${encodeURIComponent(row.url)}`}
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
    (row) => row.url
  );
  const [expandedLifterUrl, setExpandedLifterUrl] = useState<string | null>(null);
  const isMobile = useMediaQuery(MOBILE_LAYOUT_QUERY);

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
        <a href={siteRootPath()} className={styles.accentLink}>
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
          {isMobile && (
            <div className={styles.mobileSort}>
              <label htmlFor="team-summary-sort">Sort by</label>
              <select
                id="team-summary-sort"
                value={sortKey ?? 'Lifter'}
                onChange={(event) => toggleSort(event.target.value)}
              >
                {sortableColumns.map((column) => (
                  <option key={column.header} value={column.header}>
                    {column.header}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => sortKey && toggleSort(sortKey)}>
                {direction === 'desc' ? 'Descending' : 'Ascending'}
              </button>
            </div>
          )}
          {!isMobile && (
            <div className={styles.desktopTable}>
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
                      <TableRow key={row.url}>
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
            </div>
          )}
          {isMobile && (
            <div className={styles.mobileCards} aria-label="Team summary cards">
              {sortedRows.map((row) => (
                <MobileSummaryCard
                  key={row.url}
                  row={row}
                  expanded={expandedLifterUrl === row.url}
                  onToggle={() =>
                    setExpandedLifterUrl(expandedLifterUrl === row.url ? null : row.url)
                  }
                />
              ))}
            </div>
          )}
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

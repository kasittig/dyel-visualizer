import clsx from 'clsx';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTeamViewData } from './useTeamViewData';
import { useTeamViewSelection } from './useTeamViewSelection';
import { TeamHistoryChart } from './TeamHistoryChart';
import type { TeamViewRow } from './useTeamViewSelection';
import { MOBILE_LAYOUT_QUERY, useMediaQuery, useSortableRows } from '../../shared/hooks';
import { LIFT_TYPE_LABELS } from '../../shared/liftTypeLabels';
import { siteRootPath } from '../../shared/pageRouting';
import {
  TypeaheadDropdown,
  TableCard,
  Table,
  TableHeadRow,
  TableRow,
  TableCell,
  E1RMCell,
  EffortPopover,
} from '../../shared/components';
import styles from './TeamViewPage.module.css';

interface TeamViewColumn {
  header: string;
  headerClassName?: string;
  cellClassName?: string | ((row: TeamViewRow) => string | boolean | undefined);
  variant?: 'left' | 'mono';
  render: (row: TeamViewRow) => ReactNode;
  sortValue?: (row: TeamViewRow) => string | number;
}

export function TeamViewPage() {
  const dataState = useTeamViewData();
  const {
    exerciseOptions,
    selectedDisplayName,
    setSelectedDisplayName,
    reps,
    setReps,
    effortMode,
    setEffortMode,
    effortValue,
    setEffortValue,
    unit,
    setUnit,
    selectedCanonical,
    rows,
    pointsByLifter,
    erroredLifterCount,
    selectedBar,
    setSelectedBar,
    selectedStance,
    setSelectedStance,
    selectedEquipment,
    setSelectedEquipment,
    selectedAddlWt,
    setSelectedAddlWt,
    barOptions,
    stanceOptions,
    equipmentOptions,
    addlWtOptions,
    selectedLiftType,
    setSelectedLiftType,
    liftTypeOptions,
    dateRange,
    setDateRange,
    historySessionDates,
  } = useTeamViewSelection(dataState.status === 'success' ? dataState.data : []);

  const [showHistoryChart, setShowHistoryChart] = useState(false);
  const [mobileLifterUrl, setMobileLifterUrl] = useState('');
  const isMobile = useMediaQuery(MOBILE_LAYOUT_QUERY);

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
      header: 'Exercise',
      variant: 'left',
      cellClassName: () => clsx(styles.cellTint, styles.controlCell),
      sortValue: (row) => row.effectiveDisplayName,
      render: (row) => (
        <TypeaheadDropdown
          options={row.availableExerciseOptions}
          value={row.effectiveDisplayName || null}
          onChange={row.onExerciseChange}
          placeholder="Search exercise..."
        />
      ),
    },
    {
      header: 'Reps',
      variant: 'left',
      cellClassName: () => clsx(styles.cellTint, styles.repsCell),
      sortValue: (row) => row.effectiveReps,
      render: (row) => (
        <EffortPopover
          reps={row.effectiveReps}
          onRepsChange={row.onRepsChange}
          effortMode={row.effectiveEffortMode}
          effortValue={row.effectiveEffortValue}
          onEffortModeChange={row.onEffortModeChange}
          onEffortValueChange={row.onEffortValueChange}
        />
      ),
    },
    {
      header: 'Target weight',
      headerClassName: styles.headerNowrap,
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => {
        const display =
          row.showProjected && row.targetWeightProjectedDisplay
            ? row.targetWeightProjectedDisplay
            : row.targetWeightDisplay;
        return parseFloat(display) || 0;
      },
      render: (row) =>
        row.showProjected && row.targetWeightProjectedDisplay
          ? row.targetWeightProjectedDisplay
          : row.targetWeightDisplay,
    },
    {
      header: 'e1RM',
      cellClassName: (row) =>
        clsx(styles.cellTint, styles.columnDivider, !row.hasData && styles.placeholderCell),
      sortValue: (row) => {
        const display =
          row.showProjected && row.e1rmProjectedDisplay
            ? row.e1rmProjectedDisplay
            : row.e1rmDisplay;
        return (display && parseFloat(display)) || 0;
      },
      render: (row) => (
        <E1RMCell
          actualDisplay={row.e1rmDisplay}
          projectedDisplay={row.e1rmProjectedDisplay}
          sourceLabel={row.e1rmSourceLabel}
          projectedFamilyRecentDisplay={row.e1rmFamilyRecentDisplay}
          familyRecentSourceLabel={row.e1rmFamilyRecentSourceLabel}
          showProjected={row.showProjected}
          onToggle={row.onToggleProjected}
        />
      ),
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
      sortValue: (row) => row.lastPerformedSetDisplay,
      render: (row) => row.lastPerformedSetDisplay,
    },
    {
      header: 'Date',
      cellClassName: (row) => clsx(styles.cellTint, !row.hasData && styles.placeholderCell),
      sortValue: (row) => row.lastPerformedDateDisplay,
      render: (row) => row.lastPerformedDateDisplay,
    },
  ];

  const sortableColumns = columns.filter(
    (c): c is TeamViewColumn & { sortValue: (row: TeamViewRow) => string | number } => !!c.sortValue
  );
  const sortAccessors = Object.fromEntries(
    sortableColumns.map((c) => [c.header, c.sortValue])
  ) as Record<string, (row: TeamViewRow) => string | number>;
  const { sortedRows, sortKey, direction, toggleSort } = useSortableRows<TeamViewRow, string>(
    rows,
    sortAccessors,
    (row) => row.url
  );

  const sortProps = (col: TeamViewColumn) =>
    col.sortValue
      ? {
          onSort: () => toggleSort(col.header),
          sortDirection: sortKey === col.header ? direction : null,
        }
      : {};
  const focusedRow = sortedRows.find((row) => row.url === mobileLifterUrl) ?? sortedRows[0];

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
        <div className={styles.teamViewPage}>Team</div>
        <h1>Team data could not be loaded</h1>
        <p className={styles.errorMsg}>{dataState.message}</p>
        <p>
          Team views use the published team index and each lifter&apos;s published training sheet.
          Check the data setup, then try again.
        </p>
        <a href={`${siteRootPath()}?page=setup`} className={styles.accentLink}>
          Open Data &amp; Setup
        </a>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <p className={styles.backLink}>
        <a
          href={`${siteRootPath()}team/summary`}
          className={clsx(styles.accentLink, styles.summaryLink)}
          title="Try the new summary leaderboard view"
        >
          🏆 Summary view
        </a>
      </p>
      <div className={styles.teamViewPage}>Team View</div>
      <div className={styles.header}>
        <TypeaheadDropdown
          options={exerciseOptions}
          value={selectedDisplayName || null}
          onChange={setSelectedDisplayName}
          placeholder="Search exercise..."
        />
        for
        <EffortPopover
          reps={reps}
          onRepsChange={setReps}
          effortMode={effortMode}
          effortValue={effortValue}
          onEffortModeChange={setEffortMode}
          onEffortValueChange={setEffortValue}
        />
        rep{reps > 1 ? 's' : ''} (in
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
          )
        </div>
        {selectedCanonical && (
          <button
            type="button"
            onClick={() => setShowHistoryChart((v) => !v)}
            className={clsx(styles.graphButton, showHistoryChart && styles.graphButtonActive)}
          >
            Graph
          </button>
        )}
      </div>

      <div className={styles.headerRow}>
        <div className={styles.facetField}>
          <div className={styles.facetLabel}>Lift Type</div>
          <div className={styles.chipGroup}>
            <button
              type="button"
              onClick={() => setSelectedLiftType(null)}
              className={clsx(styles.chip, selectedLiftType === null && styles.chipActive)}
            >
              All
            </button>
            {liftTypeOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedLiftType(t)}
                className={clsx(styles.chip, selectedLiftType === t && styles.chipActive)}
              >
                {LIFT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        {(
          [
            { label: 'Bar', value: selectedBar, change: setSelectedBar, opts: barOptions },
            {
              label: 'Stance',
              value: selectedStance,
              change: setSelectedStance,
              opts: stanceOptions,
            },
            {
              label: 'Equipment',
              value: selectedEquipment,
              change: setSelectedEquipment,
              opts: equipmentOptions,
            },
            {
              label: 'Additional Weight',
              value: selectedAddlWt,
              change: setSelectedAddlWt,
              opts: addlWtOptions,
            },
          ] as {
            label: string;
            value: string | null;
            change: (v: string | null) => void;
            opts: readonly string[];
          }[]
        ).map(({ label, value, change, opts }) => (
          <div key={label} className={styles.facetField}>
            <div className={styles.facetLabel}>{label}</div>
            <select
              aria-label={label}
              value={value ?? ''}
              onChange={(e) => change(e.target.value || null)}
              className={styles.facetSelect}
            >
              <option value="">—</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {selectedCanonical && (
        <div className={styles.contentSplit}>
          <div className={styles.tableColumn}>
            {!rows.length ? (
              <div className={styles.emptyState}>No data for this exercise yet</div>
            ) : (
              <>
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
                  <section className={styles.mobileCoach} aria-label="Focused lifter programming">
                    <label htmlFor="mobile-lifter">Lifter</label>
                    <select
                      id="mobile-lifter"
                      value={focusedRow?.url ?? ''}
                      onChange={(event) => setMobileLifterUrl(event.target.value)}
                    >
                      {sortedRows.map((row) => (
                        <option key={row.url} value={row.url}>
                          {row.lifterName}
                        </option>
                      ))}
                    </select>
                    {focusedRow && (
                      <article className={styles.coachCard}>
                        <header>
                          <strong>{focusedRow.lifterName}</strong>
                          {focusedRow.url && (
                            <a
                              href={`${siteRootPath()}?sheet=${encodeURIComponent(focusedRow.url)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open ↗
                            </a>
                          )}
                        </header>
                        <div className={styles.mobileField}>
                          <label>Exercise</label>
                          <TypeaheadDropdown
                            options={focusedRow.availableExerciseOptions}
                            value={focusedRow.effectiveDisplayName || null}
                            onChange={focusedRow.onExerciseChange}
                            placeholder="Search exercise..."
                          />
                        </div>
                        <div className={styles.mobileField}>
                          <label>Reps and effort</label>
                          <EffortPopover
                            reps={focusedRow.effectiveReps}
                            onRepsChange={focusedRow.onRepsChange}
                            effortMode={focusedRow.effectiveEffortMode}
                            effortValue={focusedRow.effectiveEffortValue}
                            onEffortModeChange={focusedRow.onEffortModeChange}
                            onEffortValueChange={focusedRow.onEffortValueChange}
                          />
                        </div>
                        <dl className={styles.resultGrid}>
                          <div>
                            <dt>Target</dt>
                            <dd>
                              {focusedRow.showProjected && focusedRow.targetWeightProjectedDisplay
                                ? focusedRow.targetWeightProjectedDisplay
                                : focusedRow.targetWeightDisplay}
                            </dd>
                          </div>
                          <div>
                            <dt>e1RM</dt>
                            <dd>
                              <E1RMCell
                                actualDisplay={focusedRow.e1rmDisplay}
                                projectedDisplay={focusedRow.e1rmProjectedDisplay}
                                sourceLabel={focusedRow.e1rmSourceLabel}
                                projectedFamilyRecentDisplay={focusedRow.e1rmFamilyRecentDisplay}
                                familyRecentSourceLabel={focusedRow.e1rmFamilyRecentSourceLabel}
                                showProjected={focusedRow.showProjected}
                                onToggle={focusedRow.onToggleProjected}
                              />
                            </dd>
                          </div>
                          <div>
                            <dt>Sessions</dt>
                            <dd>{focusedRow.sessionCount}</dd>
                          </div>
                          <div>
                            <dt>Last trained</dt>
                            <dd>{focusedRow.lastPerformedDateDisplay}</dd>
                          </div>
                          <div className={styles.lastSetResult}>
                            <dt>Last set</dt>
                            <dd>{focusedRow.lastPerformedSetDisplay}</dd>
                          </div>
                        </dl>
                      </article>
                    )}
                  </section>
                )}
                {erroredLifterCount > 0 && (
                  <p className={styles.errorNote}>
                    {erroredLifterCount} lifter{erroredLifterCount === 1 ? '' : 's'} could not be
                    loaded
                  </p>
                )}
              </>
            )}
          </div>
          {showHistoryChart && (
            <div className={styles.chartColumn}>
              <TeamHistoryChart
                pointsByLifter={pointsByLifter}
                unit={unit}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                sessionDates={historySessionDates}
                onClose={() => setShowHistoryChart(false)}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

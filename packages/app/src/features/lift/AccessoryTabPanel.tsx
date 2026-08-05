import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { DisplayUnit } from '@dyel/api';
import { AccessoryTable } from './AccessoryTable';
import { AccessoryHistoryChart } from './AccessoryHistoryChart';
import { useAccessoryTable } from './useAccessoryTable';
import type { AccessoryTableGroup } from './useAccessoryTable';
import { ACCESSORY_CATEGORY_LABELS } from './useAccessoryTable';
import { useAccessoryCoverage } from './useAccessoryCoverage';
import { EditableDateChip } from '../../shared/components';
import styles from './AccessoryTabPanel.module.css';

export function AccessoryTabPanel({
  dateRange,
  onDateRangeChange,
  unit,
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  unit: DisplayUnit;
}) {
  const rangeKey = `${dateRange.from?.getTime() ?? ''}:${dateRange.to?.getTime() ?? ''}`;
  const groups = useAccessoryTable(unit, dateRange);
  const coverage = useAccessoryCoverage(dateRange);
  const exerciseCount = groups.reduce(
    (total, group) => total + group.rows.filter((row) => row.sessionCountInRange > 0).length,
    0
  );
  const sessionCount = groups.reduce(
    (total, group) => total + group.rows.reduce((sum, row) => sum + row.sessionCountInRange, 0),
    0
  );

  return (
    <AccessoryTabContent
      key={rangeKey}
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      groups={groups}
      exerciseCount={exerciseCount}
      sessionCount={sessionCount}
      coverage={coverage}
      unit={unit}
    />
  );
}

function AccessoryTabContent({
  dateRange,
  onDateRangeChange,
  groups,
  exerciseCount,
  sessionCount,
  coverage,
  unit,
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  groups: AccessoryTableGroup[];
  exerciseCount: number;
  sessionCount: number;
  coverage: ReturnType<typeof useAccessoryCoverage>;
  unit: DisplayUnit;
}) {
  const allRows = groups.flatMap((group) => group.rows);
  const [requestedAccessoryId, setRequestedAccessoryId] = useState<string | null>(
    () => allRows.find((row) => row.sessionCountInRange > 0)?.id ?? allRows[0]?.id ?? null
  );
  const selectedAccessoryId = allRows.some((row) => row.id === requestedAccessoryId)
    ? requestedAccessoryId
    : (allRows.find((row) => row.sessionCountInRange > 0)?.id ?? allRows[0]?.id ?? null);
  const selectedAccessory = allRows.find((row) => row.id === selectedAccessoryId) ?? null;

  return (
    <section className={styles.panel} aria-labelledby="accessory-inventory-heading">
      <header className={styles.inventoryHeader}>
        <div>
          <h2 id="accessory-inventory-heading">Accessory inventory</h2>
          <p>
            {exerciseCount
              ? `${exerciseCount} exercises · ${sessionCount} sessions in range`
              : 'No accessory sessions in this range'}
          </p>
        </div>
        <EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
      </header>
      <p className={styles.inventoryDescription}>
        Review what you are training, when you last trained it, and what you want to inspect next.
      </p>
      <section className={styles.coverage} aria-labelledby="accessory-coverage-heading">
        <h3 id="accessory-coverage-heading">Coverage in range</h3>
        {coverage.length ? (
          <ul>
            {coverage.map(({ category, sessionCount: sessions }) => (
              <li key={category}>
                <strong>{ACCESSORY_CATEGORY_LABELS[category]}</strong>
                <span>
                  {sessions} session{sessions === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No classified accessory coverage in this range.</p>
        )}
      </section>
      <AccessoryTable
        groups={groups}
        hasSessionsInRange={sessionCount > 0}
        highlightedVariation={selectedAccessoryId}
        onVariationClick={setRequestedAccessoryId}
      />
      {exerciseCount === 1 && (
        <p className={styles.lowData}>
          Only one accessory appears in this range. Widen the date range to review more training.
        </p>
      )}
      {selectedAccessory && (
        <AccessoryHistoryChart
          exerciseId={selectedAccessory.id}
          exerciseLabel={selectedAccessory.label}
          dateRange={dateRange}
          unit={unit}
        />
      )}
    </section>
  );
}

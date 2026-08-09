import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import type { DateRange } from 'react-day-picker';
import type { DisplayUnit } from '@dyel/api';
import { AccessoryTable } from './AccessoryTable';
import { AccessoryHistoryChart } from './AccessoryHistoryChart';
import { useAccessoryTable } from './useAccessoryTable';
import type { AccessoryTableGroup } from './useAccessoryTable';
import { ACCESSORY_CATEGORY_LABELS } from './useAccessoryTable';
import { useAccessoryCoverage } from './useAccessoryCoverage';
import { useWeaknessAccessoryCoverage } from './useWeaknessAccessoryCoverage';
import { WeaknessAccessoryCoverage } from './WeaknessAccessoryCoverage';
import { useCategoryEffectivenessEvidence } from './useCategoryEffectivenessEvidence';
import { CategoryEffectivenessGuide } from './CategoryEffectivenessEvidence';
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
  const weaknessCoverage = useWeaknessAccessoryCoverage(dateRange);
  const effectivenessEvidence = useCategoryEffectivenessEvidence(dateRange);
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
      weaknessCoverage={weaknessCoverage}
      effectivenessEvidence={effectivenessEvidence}
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
  weaknessCoverage,
  effectivenessEvidence,
  unit,
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  groups: AccessoryTableGroup[];
  exerciseCount: number;
  sessionCount: number;
  coverage: ReturnType<typeof useAccessoryCoverage>;
  weaknessCoverage: ReturnType<typeof useWeaknessAccessoryCoverage>;
  effectivenessEvidence: ReturnType<typeof useCategoryEffectivenessEvidence>;
  unit: DisplayUnit;
}) {
  const allRows = groups.flatMap((group) => group.rows);
  const [requestedAccessoryId, setRequestedAccessoryId] = useState<string | null>(
    () => allRows.find((row) => row.sessionCountInRange > 0)?.id ?? allRows[0]?.id ?? null
  );
  const [categoryExpandRequest, setCategoryExpandRequest] = useState({
    category: '',
    request: 0,
  });
  const selectedAccessoryId = allRows.some((row) => row.id === requestedAccessoryId)
    ? requestedAccessoryId
    : (allRows.find((row) => row.sessionCountInRange > 0)?.id ?? allRows[0]?.id ?? null);
  const selectedAccessory = allRows.find((row) => row.id === selectedAccessoryId) ?? null;
  const mappedCategories = new Set(
    weaknessCoverage.flatMap((row) =>
      row.status === 'mapped' ? row.categories.map(({ category }) => category) : []
    )
  );

  return (
    <section className={styles.panel} aria-labelledby="accessory-inventory-heading">
      <header className={styles.inventoryHeader}>
        <div>
          <div className={styles.inventoryTitle}>
            <h2 id="accessory-inventory-heading">Accessory inventory</h2>
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className={styles.helpButton}
                  aria-label="About accessory inventory"
                >
                  ?
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className={styles.helpPopover} sideOffset={7} collisionPadding={8}>
                  Review what you are training, when you last trained it, and what you want to
                  inspect next.
                  <Popover.Arrow className={styles.helpArrow} width={12} height={6} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
          <p>
            {exerciseCount
              ? `${exerciseCount} exercises · ${sessionCount} sessions in range`
              : 'No accessory sessions in this range'}
          </p>
        </div>
        <EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
      </header>
      <WeaknessAccessoryCoverage rows={weaknessCoverage} />
      <section className={styles.coverage} aria-labelledby="accessory-coverage-heading">
        <div className={styles.coverageHeader}>
          <h3 id="accessory-coverage-heading">Coverage in range</h3>
          {mappedCategories.size > 0 && (
            <span>Mapped signal is an association, not a training recommendation.</span>
          )}
        </div>
        {coverage.length ? (
          <ul>
            {coverage.map(({ category, sessionCount: sessions }) => (
              <li key={category}>
                <div>
                  <button
                    type="button"
                    className={styles.coverageCategory}
                    onClick={() =>
                      setCategoryExpandRequest((current) => ({
                        category,
                        request: current.request + 1,
                      }))
                    }
                  >
                    {ACCESSORY_CATEGORY_LABELS[category]}
                    <span aria-hidden="true">↓</span>
                  </button>
                  {mappedCategories.has(category) && (
                    <mark className={styles.recommended}>Mapped signal</mark>
                  )}
                </div>
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
      <CategoryEffectivenessGuide evidence={effectivenessEvidence} />
      <AccessoryTable
        groups={groups}
        hasSessionsInRange={sessionCount > 0}
        highlightedVariation={selectedAccessoryId}
        onVariationClick={setRequestedAccessoryId}
        effectivenessEvidence={effectivenessEvidence}
        categoryExpandRequest={categoryExpandRequest}
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

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { DisplayUnit } from '@dyel/api';
import { AccessoryTable } from './AccessoryTable';
import { useAccessoryTable } from './useAccessoryTable';
import type { AccessoryTableGroup } from './useAccessoryTable';
import { CollapsibleSection, EditableDateChip } from '../../shared/components';
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
    />
  );
}

function AccessoryTabContent({
  dateRange,
  onDateRangeChange,
  groups,
  exerciseCount,
  sessionCount,
}: {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  groups: AccessoryTableGroup[];
  exerciseCount: number;
  sessionCount: number;
}) {
  const [selectedAccessory, setSelectedAccessory] = useState<string | null>(null);

  return (
    <section className={styles.panel} aria-labelledby="accessory-work-heading">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Training inventory</p>
        <h2 id="accessory-work-heading">Accessory work</h2>
      </header>
      <CollapsibleSection
        label="Accessory inventory"
        persistenceId="visualizer:accessory:inventory"
        summary={
          exerciseCount
            ? `${exerciseCount} exercises · ${sessionCount} sessions in range`
            : 'No accessory sessions in this range'
        }
        trailing={<EditableDateChip dateRange={dateRange} onDateRangeChange={onDateRangeChange} />}
      >
        <p className={styles.inventoryDescription}>
          Review what you are training, when you last trained it, and what you want to inspect next.
        </p>
        <AccessoryTable
          groups={groups}
          hasSessionsInRange={sessionCount > 0}
          highlightedVariation={selectedAccessory}
          onVariationClick={(accessory) =>
            setSelectedAccessory((current) => (current === accessory ? null : accessory))
          }
        />
      </CollapsibleSection>
      {exerciseCount === 1 && (
        <p className={styles.lowData}>
          Only one accessory appears in this range. Widen the date range to review more training.
        </p>
      )}
      {selectedAccessory && (
        <p className={styles.selection} role="status">
          Selected: {selectedAccessory}. Its history is ready for detail views.
        </p>
      )}
    </section>
  );
}

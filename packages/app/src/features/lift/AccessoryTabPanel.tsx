import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { DisplayUnit } from '@dyel/api';
import { AccessoryTable } from './AccessoryTable';
import { useAccessoryTable } from './useAccessoryTable';
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
  const [selectedAccessory, setSelectedAccessory] = useState<string | null>(null);
  const groups = useAccessoryTable(unit, dateRange);
  const exerciseCount = groups.reduce((total, group) => total + group.rows.length, 0);
  const sessionCount = groups.reduce(
    (total, group) => total + group.rows.reduce((sum, row) => sum + row.sessionCountInRange, 0),
    0
  );

  return (
    <section className={styles.panel} aria-labelledby="accessory-work-heading">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Training inventory</p>
        <h2 id="accessory-work-heading">Accessory work</h2>
        <p>
          Review what you are training, when you last trained it, and what you want to inspect next.
        </p>
      </header>
      <CollapsibleSection
        label="Accessory inventory"
        persistenceId="visualizer:accessory:inventory"
        summary={
          exerciseCount
            ? `${exerciseCount} exercises · ${sessionCount} sessions in range`
            : 'No accessory sessions in this range'
        }
        trailing={
          <EditableDateChip
            dateRange={dateRange}
            onDateRangeChange={(range) => {
              setSelectedAccessory(null);
              onDateRangeChange(range);
            }}
          />
        }
      >
        <AccessoryTable
          groups={groups}
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

import type { DisplayUnit } from '@dyel/api';
import { useAccessoryTable } from './useAccessoryTable';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import styles from './AccessoryTable.module.css';

interface AccessoryTableProps {
  unit: DisplayUnit;
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}

export function AccessoryTable({
  unit,
  highlightedVariation,
  onVariationClick,
}: AccessoryTableProps) {
  const groups = useAccessoryTable(unit);

  if (groups.length === 0) {
    return <div className={styles.emptyState}>No accessory data logged yet</div>;
  }

  return (
    <>
      {groups.map(({ subtype, label, rows }) => (
        <CollapsibleSection key={subtype ?? 'null'} label={label}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.thead}>
                <th className={styles.cellLeft}>Exercise</th>
                <th className={styles.cell}>Last performed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label: rowLabel, lastPerformedDisplay }) => (
                <tr
                  key={rowLabel}
                  onClick={() => onVariationClick?.(rowLabel)}
                  style={{ cursor: onVariationClick ? 'pointer' : undefined }}
                  className={`${styles.bodyRow} ${rowLabel === highlightedVariation ? styles.bodyRowSelected : ''}`.trim()}
                >
                  <td className={styles.cellLeft}>{rowLabel}</td>
                  <td className={styles.cell}>{lastPerformedDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CollapsibleSection>
      ))}
    </>
  );
}

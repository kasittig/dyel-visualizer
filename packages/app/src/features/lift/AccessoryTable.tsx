import { useAccessoryTable } from './useAccessoryTable';
import type { DisplayUnit } from '@dyel/api';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import styles from './AccessoryTable.module.css';

export function AccessoryTable({
  unit,
  highlightedVariation,
  onVariationClick,
}: {
  unit: DisplayUnit;
  highlightedVariation?: string | null;
  onVariationClick?: (v: string) => void;
}) {
  const groups = useAccessoryTable(unit);

  if (groups.length === 0) {
    return <div className={styles.emptyState}>No accessory data logged yet</div>;
  }

  return (
    <>
      {groups.map((group) => (
        <CollapsibleSection key={group.subtype ?? 'null'} label={group.label}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.thead}>
                <th className={styles.cellLeft}>Exercise</th>
                <th className={styles.cell}>Last performed</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => {
                const isHighlighted = row.label === highlightedVariation;
                return (
                  <tr
                    key={row.label}
                    className={
                      isHighlighted ? `${styles.bodyRow} ${styles.bodyRowSelected}` : styles.bodyRow
                    }
                    onClick={() => onVariationClick?.(row.label)}
                    style={{ cursor: onVariationClick ? 'pointer' : undefined }}
                  >
                    <td className={styles.cellLeft}>{row.label}</td>
                    <td className={styles.cell}>{row.lastPerformedDisplay}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CollapsibleSection>
      ))}
    </>
  );
}

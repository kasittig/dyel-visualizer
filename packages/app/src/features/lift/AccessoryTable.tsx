import { useAccessoryTable } from './useAccessoryTable';
import type { DisplayUnit } from '@dyel/api';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import styles from './AccessoryTable.module.css';

export function AccessoryTable({ unit }: { unit: DisplayUnit }) {
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
              {group.rows.map((row) => (
                <tr key={row.label} className={styles.bodyRow}>
                  <td className={styles.cellLeft}>{row.label}</td>
                  <td className={styles.cell}>{row.lastPerformedDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CollapsibleSection>
      ))}
    </>
  );
}

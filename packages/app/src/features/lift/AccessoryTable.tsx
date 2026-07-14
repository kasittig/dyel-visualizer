import { useAccessoryTable } from './useAccessoryTable';
import type { DisplayUnit } from '@dyel/api';
import styles from './AccessoryTable.module.css';

export function AccessoryTable({ unit }: { unit: DisplayUnit }) {
  const rows = useAccessoryTable(unit);

  if (rows.length === 0) {
    return <div className={styles.emptyState}>No accessory data logged yet</div>;
  }

  const formatSubtype = (subtype: string | null): string => {
    if (!subtype) {
      return '—';
    }
    return subtype.charAt(0).toUpperCase() + subtype.slice(1);
  };

  return (
    <table className={styles.table}>
      <thead>
        <tr className={styles.thead}>
          <th className={styles.cellLeft}>Exercise</th>
          <th className={styles.cellLeft}>Subtype</th>
          <th className={styles.cell}>Last performed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={styles.bodyRow}>
            <td className={styles.cellLeft}>{row.label}</td>
            <td className={styles.cellLeft}>{formatSubtype(row.subtype)}</td>
            <td className={styles.cell}>{row.lastPerformedDisplay}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

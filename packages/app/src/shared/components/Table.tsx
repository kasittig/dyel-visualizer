import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import type { SortDirection } from '../hooks/useSortableRows';
import styles from './Table.module.css';

type CellVariant = 'left' | 'default' | 'mono' | 'text' | 'diagnostic';

const CELL_CLASS: Record<CellVariant, string> = {
  left: styles.cellLeft,
  default: styles.cell,
  mono: styles.cellMono,
  text: styles.cellText,
  diagnostic: styles.cellDiagnostic,
};

/** Bordered/rounded card surface (background: var(--code-bg)) wrapping a table and any related content. */
export function TableCard({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return <table className={styles.table}>{children}</table>;
}

export function TableHeadRow({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className={styles.thead}>{children}</tr>
    </thead>
  );
}

export function TableRow({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLTableRowElement>;
  children: ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
      className={`${styles.bodyRow} ${selected ? styles.bodyRowSelected : ''}`.trim()}
    >
      {children}
    </tr>
  );
}

/**
 * Table cell. When `as="th"` and `onSort` is passed, the header becomes clickable to
 * sort by that column (pair with `useSortableRows`); `sortDirection` renders the
 * active sort arrow (pass `undefined`/`null` for inactive columns).
 */
export function TableCell({
  as: Tag = 'td',
  variant = 'default',
  className: extraClassName,
  style,
  onSort,
  sortDirection,
  children,
}: {
  as?: 'td' | 'th';
  variant?: CellVariant;
  className?: string;
  style?: CSSProperties;
  onSort?: MouseEventHandler<HTMLTableCellElement>;
  sortDirection?: SortDirection | null;
  children: ReactNode;
}) {
  const className = [
    CELL_CLASS[variant],
    onSort && styles.sortable,
    sortDirection && styles.sortActive,
    extraClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      className={className}
      style={{ ...style, cursor: onSort ? 'pointer' : undefined }}
      onClick={onSort}
    >
      {children}
      {sortDirection && (
        <span className={styles.sortIndicator}>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
      )}
    </Tag>
  );
}

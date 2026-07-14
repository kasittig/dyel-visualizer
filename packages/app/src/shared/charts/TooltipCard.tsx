import type React from 'react';
import { formatChartDate } from '@dyel/api';
import styles from './TooltipCard.module.css';

/** Shared floating card used by the Recharts custom tooltips across the charts. */
export function TooltipCard({ children }: { children: React.ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}

export interface TooltipLine {
  key: string | number;
  name?: React.ReactNode;
  color?: string;
  detail: React.ReactNode;
  extra?: React.ReactNode;
}

/** Shared tooltip content: an optional header line, then one block per series/entry. */
export function ChartTooltip({ label, lines }: { label?: React.ReactNode; lines: TooltipLine[] }) {
  if (lines.length === 0) {
    return null;
  }
  const formattedLabel = typeof label === 'string' ? formatChartDate(label) : label;
  return (
    <TooltipCard>
      {formattedLabel != null && <div className={styles.date}>{formattedLabel}</div>}
      {lines.map((line) => (
        <div key={line.key} className={styles.item}>
          {line.name != null && (
            <div className={styles.name} style={{ color: line.color }}>
              {line.name}
            </div>
          )}
          <div>{line.detail}</div>
          {line.extra != null && <div className={styles.muted}>{line.extra}</div>}
        </div>
      ))}
    </TooltipCard>
  );
}

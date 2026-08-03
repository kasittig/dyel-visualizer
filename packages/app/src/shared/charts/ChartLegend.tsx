import type React from 'react';
import styles from './ChartLegend.module.css';

export interface ChartLegendItem {
  key: string;
  label: string;
  color: string;
  dash?: 'solid' | 'short' | 'long';
}

export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div className={styles.legend} aria-label="Chart series">
      {items.map((item) => (
        <span key={item.key} className={styles.item}>
          <span
            className={`${styles.swatch} ${styles[item.dash ?? 'solid']}`}
            style={{ '--legend-color': item.color } as React.CSSProperties}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

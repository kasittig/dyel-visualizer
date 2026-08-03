import type React from 'react';
import styles from './ChartLegend.module.css';

export interface ChartLegendItem {
  key: string;
  label: string;
  color: string;
  dash?: 'solid' | 'short' | 'long';
}

export function ChartLegend({
  items,
  hiddenKeys,
  onToggle,
}: {
  items: ChartLegendItem[];
  hiddenKeys?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
}) {
  return (
    <div className={styles.legend} aria-label="Chart series">
      {items.map((item) => {
        const hidden = hiddenKeys?.has(item.key) ?? false;
        const content = (
          <>
            <span
              className={`${styles.swatch} ${styles[item.dash ?? 'solid']}`}
              style={{ '--legend-color': item.color } as React.CSSProperties}
              aria-hidden="true"
            />
            {item.label}
          </>
        );
        return onToggle ? (
          <button
            key={item.key}
            type="button"
            className={`${styles.item} ${styles.button} ${hidden ? styles.hidden : ''}`}
            aria-pressed={!hidden}
            aria-label={`${item.label} series, ${hidden ? 'hidden' : 'visible'}`}
            onClick={() => onToggle(item.key)}
          >
            {content}
          </button>
        ) : (
          <span key={item.key} className={styles.item}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

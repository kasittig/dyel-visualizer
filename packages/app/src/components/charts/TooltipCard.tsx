import type React from 'react';
import styles from './TooltipCard.module.css';

/** Shared floating card used by the Recharts custom tooltips across the charts. */
export function TooltipCard({ children }: { children: React.ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}

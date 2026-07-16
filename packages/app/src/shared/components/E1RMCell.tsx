import { useState } from 'react';
import clsx from 'clsx';
import styles from './E1RMCell.module.css';

export function E1RMCell({
  actualDisplay,
  projectedDisplay,
  sourceLabel,
  className,
}: {
  actualDisplay: string;
  projectedDisplay: string | null;
  sourceLabel?: string | null;
  className?: string;
}) {
  const [showProjected, setShowProjected] = useState(false);

  const canToggle = projectedDisplay !== null && projectedDisplay !== actualDisplay;
  const displayValue = showProjected && canToggle ? projectedDisplay : actualDisplay;

  if (!canToggle) {
    return <span className={clsx(styles.cell, className)}>{displayValue}</span>;
  }

  return (
    <span
      className={clsx(styles.cell, styles.toggleable, className)}
      role="button"
      tabIndex={0}
      title={showProjected ? (sourceLabel ?? undefined) : undefined}
      onClick={() => setShowProjected((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setShowProjected((v) => !v);
        }
      }}
    >
      {displayValue}
      <span
        className={styles.projectedIcon}
        title={showProjected ? (sourceLabel ?? undefined) : undefined}
        aria-hidden={!showProjected}
        style={{ visibility: showProjected ? 'visible' : 'hidden' }}
      >
        *
      </span>
    </span>
  );
}

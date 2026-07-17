import { useState } from 'react';
import clsx from 'clsx';
import styles from './E1RMCell.module.css';

export function E1RMCell({
  actualDisplay,
  projectedDisplay,
  sourceLabel,
  className,
  showProjected: controlledShowProjected,
  onToggle,
}: {
  actualDisplay: string;
  projectedDisplay: string | null;
  sourceLabel?: string | null;
  className?: string;
  showProjected?: boolean;
  onToggle?: () => void;
}) {
  const [internalShowProjected, setInternalShowProjected] = useState(false);
  const isControlled = controlledShowProjected !== undefined && onToggle !== undefined;
  const showProjected = isControlled ? controlledShowProjected : internalShowProjected;
  const toggle = isControlled ? onToggle : () => setInternalShowProjected((v) => !v);

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
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
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

import { useState } from 'react';
import clsx from 'clsx';
import styles from './E1RMCell.module.css';

export function E1RMCell({
  actualDisplay,
  projectedDisplay,
  sourceLabel,
  projectedFamilyRecentDisplay,
  familyRecentSourceLabel,
  className,
  showProjected: controlledShowProjected,
  onToggle,
}: {
  actualDisplay: string;
  projectedDisplay: string | null;
  sourceLabel?: string | null;
  projectedFamilyRecentDisplay?: string | null;
  familyRecentSourceLabel?: string | null;
  className?: string;
  showProjected?: boolean;
  onToggle?: () => void;
}) {
  const [internalShowProjected, setInternalShowProjected] = useState(false);
  const isControlled = controlledShowProjected !== undefined && onToggle !== undefined;
  const showProjected = isControlled ? controlledShowProjected : internalShowProjected;
  const toggle = isControlled ? onToggle : () => setInternalShowProjected((v) => !v);

  const canToggle =
    (projectedDisplay !== null && projectedDisplay !== actualDisplay) ||
    (projectedFamilyRecentDisplay != null && projectedFamilyRecentDisplay !== actualDisplay);

  const showBoth =
    showProjected &&
    projectedDisplay !== null &&
    projectedFamilyRecentDisplay != null &&
    projectedDisplay !== projectedFamilyRecentDisplay;

  const displayValue =
    showProjected && canToggle ? (projectedDisplay ?? projectedFamilyRecentDisplay) : actualDisplay;
  const activeSourceLabel = projectedDisplay !== null ? sourceLabel : familyRecentSourceLabel;
  const title =
    showProjected && canToggle && !showBoth ? (activeSourceLabel ?? undefined) : undefined;

  if (!canToggle) {
    return <span className={clsx(styles.cell, className)}>{displayValue}</span>;
  }

  return (
    <span
      className={clsx(styles.cell, styles.toggleable, className)}
      role="button"
      tabIndex={0}
      title={title}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {showBoth ? (
        <span className={styles.stack}>
          <span className={styles.compBadge} title="Projected from competition lift">
            🏆
          </span>
          <span className={styles.stackValue} title={sourceLabel ?? undefined}>
            {projectedDisplay}
          </span>
          <span className={clsx(styles.badgeSpacer, styles.divided)} aria-hidden="true" />
          <span
            className={clsx(styles.stackValue, styles.divided)}
            title={familyRecentSourceLabel ?? undefined}
          >
            {projectedFamilyRecentDisplay}
          </span>
        </span>
      ) : (
        displayValue
      )}
      <span
        className={styles.projectedIcon}
        title={title}
        aria-hidden={!showProjected}
        style={{ visibility: showProjected ? 'visible' : 'hidden' }}
      >
        *
      </span>
    </span>
  );
}

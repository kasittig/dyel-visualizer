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

  const hasBaseline = projectedDisplay !== null && projectedDisplay !== actualDisplay;
  const hasFamilyRecent =
    projectedFamilyRecentDisplay != null && projectedFamilyRecentDisplay !== actualDisplay;
  const canToggle = hasBaseline || hasFamilyRecent;

  const bothProjectionsPresent = projectedDisplay !== null && projectedFamilyRecentDisplay != null;
  const bothProjectionsDiffer = projectedDisplay !== projectedFamilyRecentDisplay;
  const showBothProjections = showProjected && bothProjectionsPresent && bothProjectionsDiffer;

  const singleProjectedValue =
    showProjected && canToggle && !showBothProjections
      ? (projectedDisplay ?? projectedFamilyRecentDisplay)
      : null;

  const displayValue = singleProjectedValue ?? actualDisplay;

  // Determine which source label to use for the icon when showing single projection
  const activeSourceLabel =
    showProjected && canToggle && !showBothProjections
      ? projectedDisplay !== null
        ? sourceLabel
        : familyRecentSourceLabel
      : sourceLabel;

  if (!canToggle) {
    return <span className={clsx(styles.cell, className)}>{displayValue}</span>;
  }

  return (
    <span
      className={clsx(styles.cell, styles.toggleable, className)}
      role="button"
      tabIndex={0}
      title={showProjected && !showBothProjections ? (activeSourceLabel ?? undefined) : undefined}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {showBothProjections ? (
        <>
          <span title={sourceLabel ?? undefined}>{projectedDisplay} (comp)</span>
          {' · '}
          <span title={familyRecentSourceLabel ?? undefined}>
            {projectedFamilyRecentDisplay} (recent)
          </span>
        </>
      ) : (
        displayValue
      )}
      <span
        className={styles.projectedIcon}
        title={showProjected && !showBothProjections ? (activeSourceLabel ?? undefined) : undefined}
        aria-hidden={!showProjected}
        style={{ visibility: showProjected ? 'visible' : 'hidden' }}
      >
        *
      </span>
    </span>
  );
}

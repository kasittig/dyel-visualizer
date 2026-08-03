import { useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import type { EffortMode } from '@dyel/api';
import { EffortInput } from './EffortInput';
import styles from './EffortPopover.module.css';

interface EffortPopoverProps {
  reps: number;
  onRepsChange: (reps: number) => void;
  effortMode: EffortMode;
  effortValue: number;
  onEffortModeChange: (mode: EffortMode) => void;
  onEffortValueChange: (value: number) => void;
}

export function EffortPopover({
  reps,
  onRepsChange,
  effortMode,
  effortValue,
  onEffortModeChange,
  onEffortValueChange,
}: EffortPopoverProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const shouldShowBadge =
    (effortMode === 'rpe' && effortValue !== 10) || (effortMode === 'pct' && effortValue !== 100);
  const badgeText = effortMode === 'rpe' ? `RPE${effortValue}` : `${effortValue}%`;

  // Radix's built-in "click/focus outside to dismiss" doesn't compose cleanly with a plain
  // Popover.Anchor driven by our own click handler: Popover.Anchor (unlike Popover.Trigger)
  // isn't automatically exempted from outside-interaction detection, so re-clicking the same
  // anchor to reopen (or interacting with it while already open) can race with Radix's own
  // dismissal and leave the popover unable to reopen. Same fix DateRangePicker.tsx already
  // uses: fully suppress Radix's automatic outside-interaction handling below and own outside
  // dismissal ourselves via a manual document listener, which only reacts to genuine clicks
  // outside both the anchor and the popover content.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!anchorRef.current?.contains(target) && !contentRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => document.removeEventListener('mousedown', handleMouseDown, { capture: true });
  }, [open]);

  return (
    <div className={styles.container}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor asChild>
          <div
            ref={anchorRef}
            className={clsx(styles.inputWrapper, open && styles.inputWrapperActive)}
          >
            <input
              type="number"
              min={1}
              max={20}
              value={reps}
              className={clsx(styles.repsInput, open && styles.repsInputActive)}
              aria-label={`Reps: ${reps}. Activate to set RPE or percentage`}
              aria-expanded={open}
              inputMode="numeric"
              onClick={() => setOpen(true)}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onRepsChange(Number.isNaN(val) || val < 1 ? 1 : val);
              }}
            />
            <span
              className={styles.badgeIndicator}
              style={{ visibility: shouldShowBadge ? 'visible' : 'hidden' }}
              aria-hidden
            >
              {badgeText}
            </span>
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            ref={contentRef}
            className={styles.popover}
            sideOffset={8}
            collisionPadding={8}
            aria-label="Effort settings"
            onInteractOutside={(e) => e.preventDefault()}
            onFocusOutside={(e) => e.preventDefault()}
          >
            <Popover.Arrow className={styles.arrow} width={14} height={7} />
            <div className={styles.popoverHeader}>Effort</div>
            <EffortInput
              mode={effortMode}
              value={effortValue}
              onModeChange={onEffortModeChange}
              onValueChange={onEffortValueChange}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

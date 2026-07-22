import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
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

  const shouldShowBadge =
    (effortMode === 'rpe' && effortValue !== 10) || (effortMode === 'pct' && effortValue !== 100);
  const badgeText = effortMode === 'rpe' ? `RPE${effortValue}` : `${effortValue}%`;

  return (
    <div className={styles.container}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor asChild>
          <div className={styles.inputWrapper}>
            <input
              type="number"
              min={1}
              max={20}
              value={reps}
              className={styles.repsInput}
              title="Double-click to set RPE / %"
              onDoubleClick={() => setOpen(true)}
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
          <Popover.Content className={styles.popover} sideOffset={6}>
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

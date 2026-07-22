import type { EffortMode } from '@dyel/api';
import clsx from 'clsx';
import styles from './EffortInput.module.css';

interface EffortInputProps {
  mode: EffortMode;
  value: number;
  onModeChange: (mode: EffortMode) => void;
  onValueChange: (value: number) => void;
}

export function EffortInput({ mode, value, onModeChange, onValueChange }: EffortInputProps) {
  return (
    <div className={styles.effortInputRow}>
      <button
        type="button"
        onClick={() => onModeChange('rpe')}
        className={clsx(styles.chip, mode === 'rpe' && styles.chipActive)}
      >
        RPE
      </button>
      <input
        type="number"
        min={1}
        max={mode === 'rpe' ? 10 : 100}
        step={mode === 'rpe' ? 0.5 : 1}
        value={value}
        className={styles.effortValueInput}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          const max = mode === 'rpe' ? 10 : 100;
          const step = mode === 'rpe' ? 0.5 : 1;
          const snapped = Number.isNaN(val) ? 1 : Math.round(val / step) * step;
          onValueChange(Math.min(max, Math.max(1, snapped)));
        }}
      />
      <button
        type="button"
        onClick={() => onModeChange('pct')}
        className={clsx(styles.chip, mode === 'pct' && styles.chipActive)}
      >
        %
      </button>
    </div>
  );
}

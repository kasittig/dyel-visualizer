import clsx from 'clsx';
import type { InputMode } from '../../app/appTabs';
import styles from './InputModeToggle.module.css';

export function InputModeToggle({
  mode,
  onModeChange,
}: {
  mode: InputMode;
  onModeChange: (m: InputMode) => void;
}) {
  return (
    <div className={styles.modeToggle} role="tablist" aria-label="Data source">
      {(['url', 'text'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          className={clsx(styles.modeButton, mode === m && styles.modeButtonActive)}
          onClick={() => onModeChange(m)}
        >
          {m === 'url' ? 'Sheet URL' : 'Paste text'}
        </button>
      ))}
    </div>
  );
}

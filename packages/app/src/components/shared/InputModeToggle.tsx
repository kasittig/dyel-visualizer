import clsx from 'clsx';
import type { InputMode } from '../../utils/appTabs';
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
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'url'}
        className={clsx(styles.modeButton, mode === 'url' && styles.modeButtonActive)}
        onClick={() => onModeChange('url')}
      >
        Sheet URL
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'text'}
        className={clsx(styles.modeButton, mode === 'text' && styles.modeButtonActive)}
        onClick={() => onModeChange('text')}
      >
        Paste text
      </button>
    </div>
  );
}

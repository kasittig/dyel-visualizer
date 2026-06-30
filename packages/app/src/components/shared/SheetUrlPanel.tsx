import { EXAMPLE_SHEET_URL, EXAMPLE_VISUALIZER_URL } from '../../utils/appUtils';
import styles from './SheetUrlPanel.module.css';

/** App header: title plus the collapsible Google-Sheet URL input and helper links. */
export function SheetUrlPanel({
  showUrlPanel,
  url,
  loaded,
  invalidUrl,
  onUrlChange,
  onForceOpen,
  onCancel,
}: {
  showUrlPanel: boolean;
  url: string;
  loaded: boolean;
  invalidUrl: boolean;
  onUrlChange: (value: string) => void;
  onForceOpen: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.wrapper}>
      <h1>DYEL Visualizer</h1>
      {!showUrlPanel ? (
        <p className={styles.subtitle}>
          <button onClick={onForceOpen} className={styles.linkButton}>
            Change sheet URL
          </button>
          {' · '}
          <a href="?page=conjugate" className={styles.accentLink}>
            What is the conjugate method?
          </a>
        </p>
      ) : (
        <>
          <p className={styles.subtitle}>
            {loaded ? (
              <button onClick={onCancel} className={styles.linkButton}>
                Cancel
              </button>
            ) : (
              <a href="?page=conjugate" className={styles.accentLink}>
                What is the conjugate method?
              </a>
            )}
            {' · '}
            <a href="?page=validator" className={styles.accentLink}>
              Check if my spreadsheet will work
            </a>
          </p>
          <div className={styles.urlRow}>
            <label htmlFor="sheet-url" className={styles.urlLabel}>
              Your Google Sheet
            </label>
            <input
              id="sheet-url"
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className={styles.urlInput}
              autoFocus={loaded}
            />
          </div>
          {invalidUrl && (
            <p className={styles.invalidUrl}>That doesn't look like a Google Sheet URL.</p>
          )}
          <p className={styles.helperLinks}>
            Don't have a sheet?{' '}
            <a href={EXAMPLE_VISUALIZER_URL}>View an example in the visualizer</a>
            {' · '}
            <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
              View the example spreadsheet
            </a>
          </p>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useIndexData } from '../../hooks/data/useIndexData';
import { EXAMPLE_SHEET_URL, EXAMPLE_VISUALIZER_URL } from './sheetRef';
import type { InputMode } from '../../app/appTabs';
import { InputModeToggle } from './InputModeToggle';
import styles from './SheetUrlPanel.module.css';

/** App header: title plus the collapsible data-source panel (Sheet URL or pasted text) and helper links. */
export function SheetUrlPanel({
  showUrlPanel,
  url,
  loaded,
  invalidUrl,
  onUrlChange,
  onForceOpen,
  onCancel,
  onRefresh,
  mode,
  onModeChange,
  text,
  onTextChange,
}: {
  showUrlPanel: boolean;
  url: string;
  loaded: boolean;
  invalidUrl: boolean;
  onUrlChange: (value: string) => void;
  onForceOpen: () => void;
  onCancel: () => void;
  onRefresh: () => void;
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  text: string;
  onTextChange: (value: string) => void;
}) {
  const indexData = useIndexData();
  const [draft, setDraft] = useState(text);
  const [prevText, setPrevText] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setDraft(text);
  }

  const matchedEntry =
    indexData.status === 'success'
      ? indexData.entries.find((entry) => entry.url === url)
      : undefined;

  return (
    <div className={styles.wrapper}>
      <h1>DYEL Visualizer</h1>
      {!showUrlPanel ? (
        <p className={styles.subtitle}>
          <button onClick={onForceOpen} className={styles.linkButton}>
            Change data source
          </button>
          {' · '}
          <button
            onClick={onRefresh}
            className={styles.refreshButton}
            title="Reload data from sheet"
          >
            ↻
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
            <a
              href={
                url.trim()
                  ? `?page=validator&url=${encodeURIComponent(url.trim())}`
                  : '?page=validator'
              }
              className={styles.accentLink}
            >
              See if your training log is compatible
            </a>
          </p>
          <InputModeToggle mode={mode} onModeChange={onModeChange} />
          {mode === 'url' ? (
            <>
              {indexData.status === 'success' && (
                <div className={styles.urlRow}>
                  <label htmlFor="sheet-index" className={styles.urlLabel}>
                    Lifter:
                  </label>
                  <select
                    id="sheet-index"
                    className={styles.input}
                    value={matchedEntry?.url ?? ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        onUrlChange(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Select from index --</option>
                    {indexData.entries.map(({ name, url: entryUrl }) => (
                      <option key={entryUrl} value={entryUrl}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.urlRow}>
                <label htmlFor="sheet-url" className={styles.urlLabel}>
                  Sheet URL:
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
          ) : (
            <>
              <label htmlFor="paste-text" className={styles.urlLabel}>
                Paste exercises (one per line):
              </label>
              <textarea
                id="paste-text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => onTextChange(draft)}
                placeholder={'comp squat 1rm 300lbs\ncomp bench 1rm 200lbs'}
                className={styles.textArea}
                rows={6}
                autoFocus={loaded}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

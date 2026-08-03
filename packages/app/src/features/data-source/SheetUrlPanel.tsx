import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useIndexData } from '../index-page/useIndexData';
import { EXAMPLE_SHEET_URL, EXAMPLE_VISUALIZER_URL } from './sheetRef';
import type { InputMode } from '../../app/appTabs';
import { InputModeToggle } from './InputModeToggle';
import { MOBILE_LAYOUT_QUERY, useMediaQuery } from '../../shared/hooks';
import styles from './SheetUrlPanel.module.css';

interface SettingsContentProps {
  idPrefix: string;
  autoFocus: boolean;
  url: string;
  invalidUrl: boolean;
  mode: InputMode;
  text: string;
  draft: string;
  matchedUrl?: string;
  indexEntries: { name: string; url: string }[];
  indexLoaded: boolean;
  onUrlChange: (v: string) => void;
  onModeChange: (m: InputMode) => void;
  onDraftChange: (v: string) => void;
  onTextChange: (v: string) => void;
}

function SettingsContent({
  idPrefix,
  autoFocus,
  url,
  invalidUrl,
  mode,
  text,
  draft,
  matchedUrl,
  indexEntries,
  indexLoaded,
  onUrlChange,
  onModeChange,
  onDraftChange,
  onTextChange,
}: SettingsContentProps) {
  const lifterId = `${idPrefix}-sheet-index`;
  const urlId = `${idPrefix}-sheet-url`;
  const textId = `${idPrefix}-paste-text`;

  return (
    <>
      <InputModeToggle mode={mode} onModeChange={onModeChange} />
      {mode === 'url' ? (
        <>
          {indexLoaded && (
            <div className={styles.urlRow}>
              <label htmlFor={lifterId} className={styles.urlLabel}>
                Lifter:
              </label>
              <select
                id={lifterId}
                className={styles.input}
                value={matchedUrl ?? ''}
                onChange={(event) => event.target.value && onUrlChange(event.target.value)}
              >
                <option value="">-- Select from index --</option>
                {indexEntries.map(({ name, url: entryUrl }) => (
                  <option key={entryUrl} value={entryUrl}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={styles.urlRow}>
            <label htmlFor={urlId} className={styles.urlLabel}>
              Sheet URL:
            </label>
            <input
              id={urlId}
              type="url"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className={styles.urlInput}
              inputMode="url"
              autoFocus={autoFocus}
            />
          </div>
          {invalidUrl && (
            <p className={styles.invalidUrl} role="alert">
              Enter a published Google Sheet URL to continue.
            </p>
          )}
          <p className={styles.helperLinks}>
            Need a starting point? <a href={EXAMPLE_VISUALIZER_URL}>Open the example</a>{' '}
            <span aria-hidden="true">·</span>{' '}
            <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
              View example sheet
            </a>
          </p>
        </>
      ) : (
        <>
          <label htmlFor={textId} className={styles.urlLabel}>
            Paste exercises (one per line):
          </label>
          <textarea
            id={textId}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={() => onTextChange(draft)}
            placeholder={'comp squat 1rm 300lbs\ncomp bench 1rm 200lbs'}
            className={styles.textArea}
            rows={6}
            autoFocus={autoFocus}
          />
          {!text && (
            <p className={styles.helperLinks}>
              Add one exercise per line to visualize your training.
            </p>
          )}
        </>
      )}
    </>
  );
}

function SettingsLinks({ valUrl }: { valUrl: string }): ReactNode {
  return (
    <nav className={styles.settingsLinks} aria-label="Data and help links">
      <a href={valUrl}>Validate training log</a>
      <a href="?page=team">View team</a>
      <a href="?page=conjugate">Help &amp; conjugate method</a>
    </nav>
  );
}

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
  onUrlChange: (v: string) => void;
  onForceOpen: () => void;
  onCancel: () => void;
  onRefresh: () => void;
  mode: InputMode;
  onModeChange: (m: InputMode) => void;
  text: string;
  onTextChange: (v: string) => void;
}) {
  const indexData = useIndexData();
  const [draft, setDraft] = useState(text);
  const [prevText, setPrevText] = useState(text);
  const [mobileOpen, setMobileOpen] = useState(showUrlPanel);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mobile = useMediaQuery(MOBILE_LAYOUT_QUERY);

  if (text !== prevText) {
    setPrevText(text);
    setDraft(text);
  }

  const matched =
    indexData.status === 'success'
      ? indexData.entries.find((entry) => entry.url === url)
      : undefined;
  const valUrl = `?page=validator${url.trim() ? `&url=${encodeURIComponent(url.trim())}` : ''}`;
  const sourceLabel =
    mode === 'text'
      ? text.trim()
        ? 'Pasted training log'
        : 'No training data'
      : (matched?.name ?? (url.trim() ? 'Google Sheet' : 'No data source'));
  const settingsProps = {
    url,
    invalidUrl,
    mode,
    text,
    draft,
    matchedUrl: matched?.url,
    indexEntries: indexData.status === 'success' ? indexData.entries : [],
    indexLoaded: indexData.status === 'success',
    onUrlChange,
    onModeChange,
    onDraftChange: setDraft,
    onTextChange,
  };
  const settingsContent = (
    <SettingsContent
      idPrefix={mobile ? 'mobile' : 'desktop'}
      autoFocus={!mobile && loaded}
      {...settingsProps}
    />
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (mobileOpen && mobile && !dialog.open) {
      dialog.showModal();
    } else if ((!mobileOpen || !mobile) && dialog.open) {
      dialog.close();
    }
  }, [mobile, mobileOpen]);

  const openSettings = () => {
    onForceOpen();
    setMobileOpen(true);
  };
  const closeSettings = () => {
    dialogRef.current?.close();
    setMobileOpen(false);
    onCancel();
  };

  return (
    <header className={styles.wrapper}>
      {mobile && (
        <div className={styles.mobileHeader}>
          <div className={styles.mobileIdentity}>
            <span className={styles.mobileWordmark}>DYEL</span>
            <span className={styles.mobileSource} title={sourceLabel}>
              {sourceLabel}
            </span>
          </div>
          <button
            type="button"
            className={styles.settingsButton}
            onClick={openSettings}
            aria-haspopup="dialog"
            aria-controls="data-source-settings"
          >
            <span aria-hidden="true">⚙</span>
            <span>{loaded ? 'Settings' : 'Add source'}</span>
          </button>
        </div>
      )}

      {!mobile && (
        <div
          className={`${styles.desktopPanel} ${!showUrlPanel ? styles.desktopPanelCompact : ''}`}
        >
          <h1>DYEL Visualizer</h1>
          {!showUrlPanel ? (
            <p className={styles.subtitle}>
              <button onClick={onForceOpen} className={styles.linkButton}>
                Data source
              </button>{' '}
              ·{' '}
              <button
                onClick={onRefresh}
                className={styles.refreshButton}
                aria-label="Reload data from sheet"
                title="Reload data from sheet"
              >
                ↻
              </button>{' '}
              · <a href="?page=conjugate">Help</a> · <a href="?page=team">Team</a>
            </p>
          ) : (
            <div className={styles.desktopSettings}>
              <p className={styles.subtitle}>
                {loaded ? (
                  <button onClick={onCancel} className={styles.linkButton}>
                    Cancel
                  </button>
                ) : (
                  <a href="?page=conjugate">What is the conjugate method?</a>
                )}{' '}
                · <a href={valUrl}>See if your training log is compatible</a> ·{' '}
                <a href="?page=team">View team</a>
              </p>
              {settingsContent}
            </div>
          )}
        </div>
      )}

      {mobile && (
        <dialog
          id="data-source-settings"
          ref={dialogRef}
          className={styles.settingsDialog}
          aria-labelledby="data-source-settings-title"
          onCancel={(event) => {
            event.preventDefault();
            closeSettings();
          }}
          onClose={() => setMobileOpen(false)}
        >
          <div className={styles.dialogHeader}>
            <div>
              <p className={styles.dialogEyebrow}>Current source · {sourceLabel}</p>
              <h2 id="data-source-settings-title">Data settings</h2>
            </div>
            <button type="button" className={styles.closeButton} onClick={closeSettings}>
              <span aria-hidden="true">×</span>
              <span className={styles.srOnly}>Close data settings</span>
            </button>
          </div>
          <div className={styles.dialogBody}>
            {settingsContent}
            {loaded && mode === 'url' && (
              <button type="button" className={styles.refreshAction} onClick={onRefresh}>
                <span aria-hidden="true">↻</span> Refresh sheet data
              </button>
            )}
            <SettingsLinks valUrl={valUrl} />
          </div>
          <div className={styles.dialogFooter}>
            <button type="button" className={styles.doneButton} onClick={closeSettings}>
              Done
            </button>
          </div>
        </dialog>
      )}
    </header>
  );
}

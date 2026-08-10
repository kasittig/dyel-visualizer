import type { InputMode } from '../../app/appTabs';
import { siteRootPath } from '../../shared/pageRouting';
import { InputModeToggle } from './InputModeToggle';
import { EXAMPLE_SHEET_URL, EXAMPLE_VISUALIZER_URL } from './sheetRef';
// Keep IndexPage lazy: its barrel also exports the page component.
import { useIndexData } from '../index-page/useIndexData';
import styles from './DataSetupPage.module.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

export interface DataSetupPageProps {
  mode: InputMode;
  url: string;
  text: string;
  status: Status;
  requestStatus: Status;
  requestError: string | null;
  invalidUrl: boolean;
  isUsingCachedData: boolean;
  lastUpdatedAt: Date | null;
  onModeChange: (mode: InputMode) => void;
  onUrlChange: (url: string) => void;
  onTextChange: (text: string) => void;
  onRefresh: () => void;
}

export function DataSetupPage(props: DataSetupPageProps) {
  const index = useIndexData();
  const {
    mode,
    url,
    text,
    status,
    requestStatus,
    requestError,
    invalidUrl,
    isUsingCachedData,
    lastUpdatedAt,
    onModeChange,
    onUrlChange,
    onTextChange,
    onRefresh,
  } = props;
  const configured = mode === 'url' ? !!url.trim() : !!text.trim();
  const loading = requestStatus === 'loading';
  const connected = status === 'success';
  const validatorHref = `?page=validator${url.trim() ? `&url=${encodeURIComponent(url.trim())}` : ''}`;
  const failure =
    mode === 'text' && status === 'error'
      ? 'This pasted input does not contain supported exercise lines. Add one exercise per line, such as “comp squat 1rm 300lbs”, then try again.'
      : (requestError ??
        (status === 'error'
          ? 'The source was reached, but its contents are not compatible with the training-data format. Validate it below to find the rows that need attention.'
          : null));

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="source-heading">
        <div className={styles.statusHeader}>
          <div>
            <h2 id="source-heading">Current source</h2>
            <p className={styles.sourceName}>
              {!configured
                ? 'No training data connected'
                : mode === 'text'
                  ? 'Pasted training log'
                  : 'Published Google Sheet'}
            </p>
          </div>
          <span className={styles.status} data-state={connected ? 'connected' : requestStatus}>
            {loading
              ? isUsingCachedData
                ? 'Refreshing · cached data shown'
                : 'Validating & loading'
              : connected
                ? isUsingCachedData
                  ? 'Connected · cached data'
                  : 'Connected'
                : requestStatus === 'error'
                  ? 'Needs attention'
                  : 'Not connected'}
          </span>
        </div>
        {lastUpdatedAt && (
          <p className={styles.updated} role="status">
            Data last updated{' '}
            <time dateTime={lastUpdatedAt.toISOString()}>{lastUpdatedAt.toLocaleString()}</time>.
            {isUsingCachedData &&
              ' The latest saved copy remains available while refresh completes.'}
          </p>
        )}
        {(invalidUrl || failure) && (
          <div className={styles.error} role="alert">
            <strong>
              {invalidUrl
                ? 'That URL is not a supported published sheet.'
                : 'Training data could not be loaded.'}
            </strong>
            <p>
              {invalidUrl
                ? 'Paste the published-to-web Google Sheet URL, or switch to pasted input.'
                : failure}
            </p>
          </div>
        )}
        <InputModeToggle mode={mode} onModeChange={onModeChange} />
        {mode === 'url' && index.status === 'success' && index.entries.length > 0 && (
          <div className={styles.indexPicker}>
            <span>Choose from your index</span>
            <div className={styles.indexChoices}>
              {index.entries.map((entry) => (
                <button
                  key={entry.url}
                  type="button"
                  aria-pressed={url === entry.url}
                  onClick={() => onUrlChange(entry.url)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === 'url' ? (
          <label className={styles.field}>
            <span>Published sheet URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/…/pubhtml"
            />
            <small>Publish the sheet via File → Share → Publish to web before connecting.</small>
          </label>
        ) : (
          <label className={styles.field}>
            <span>Training log</span>
            <textarea
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={'comp squat 1rm 300lbs\ncomp bench 1rm 200lbs'}
              rows={8}
            />
          </label>
        )}
        <div className={styles.actions}>
          {connected && mode === 'url' && (
            <button type="button" onClick={onRefresh} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
          )}
          {configured && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => (mode === 'url' ? onUrlChange('') : onTextChange(''))}
            >
              Disconnect
            </button>
          )}
          <a href={siteRootPath()}>Go to My Training</a>
        </div>
      </section>
      <section className={styles.card} aria-labelledby="help-heading">
        <h2 id="help-heading">Troubleshoot</h2>
        <div className={styles.links}>
          <a href={validatorHref}>Validate training data</a>
          <a href="?page=pipeline-validation">Review exercise compatibility</a>
          <a href={EXAMPLE_VISUALIZER_URL}>Open the example</a>
          <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
            View example sheet
          </a>
        </div>
      </section>
    </main>
  );
}

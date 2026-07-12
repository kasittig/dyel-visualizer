import { EXAMPLE_SHEET_URL } from './sheetRef';
import type { InputMode } from '../../app/appTabs';
import styles from './GettingStarted.module.css';

export function GettingStarted({ mode }: { mode: InputMode }) {
  return (
    <div className={styles.container}>
      <p className={styles.title}>Getting started</p>
      <ol className={styles.steps}>
        {mode === 'url' ? (
          <>
            <li className={styles.step}>
              <strong>Set up your spreadsheet</strong> — needs columns for <code>date</code>,{' '}
              <code>exercise</code>, <code>weight</code>, and <code>reps</code>. Use the{' '}
              <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
                example sheet
              </a>
              .
            </li>
            <li className={styles.step}>
              <strong>Publish to the web</strong> — in Google Sheets:{' '}
              <strong>File → Share → Publish to web</strong>, choose{' '}
              <em>Comma-separated values (.csv)</em>.
            </li>
            <li>
              <strong>Paste the URL above</strong> — either the published or regular spreadsheet URL
              works.
            </li>
          </>
        ) : (
          <>
            <li className={styles.step}>
              <strong>Paste one exercise per line</strong> —{' '}
              <code>exercise weight[unit] [xreps]</code> (e.g. <code>comp squat 405lbs x2</code>).
            </li>
            <li className={styles.step}>
              <strong>Or log a rep max</strong> — <code>exercise Nrm weight[unit]</code> (e.g.{' '}
              <code>comp squat 1rm 405lbs</code>).
            </li>
            <li>
              <strong>Add a date if wanted</strong> — place anywhere (e.g. <code>2024-11-04</code>),
              defaults to today.
            </li>
          </>
        )}
      </ol>
      <p className={styles.footer}>
        Not sure if your {mode === 'url' ? 'sheet' : 'text'} is compatible?{' '}
        <a href="?page=validator" className={styles.accentLink}>
          Run it through the validator.
        </a>
      </p>
    </div>
  );
}

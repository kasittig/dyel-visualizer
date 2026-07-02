import { EXAMPLE_SHEET_URL } from '../../utils/appUtils';
import type { InputMode } from '../../utils/appUtils';
import styles from './GettingStarted.module.css';

/** Onboarding checklist shown before any data has been entered, tailored to the active input mode. */
export function GettingStarted({ mode }: { mode: InputMode }) {
  return (
    <div className={styles.container}>
      <p className={styles.title}>Getting started</p>
      <ol className={styles.steps}>
        {mode === 'url' ? (
          <>
            <li className={styles.step}>
              <strong>Set up your spreadsheet</strong> — your sheet needs columns for{' '}
              <code>date</code>, <code>exercise</code>, <code>weight</code>, and <code>reps</code>.
              Use the{' '}
              <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
                example sheet
              </a>{' '}
              as a template.
            </li>
            <li className={styles.step}>
              <strong>Publish to the web</strong> — in Google Sheets, go to{' '}
              <strong>File → Share → Publish to web</strong>, choose{' '}
              <em>Comma-separated values (.csv)</em>, and click Publish.
            </li>
            <li>
              <strong>Paste the URL above</strong> — the published URL or your sheet's regular URL
              both work.
            </li>
          </>
        ) : (
          <>
            <li className={styles.step}>
              <strong>Paste one exercise per line</strong> — format:{' '}
              <code>exercise weight[unit] [xreps]</code>, e.g. <code>comp squat 405lbs x2</code>{' '}
              (reps optional, unit defaults to lbs).
            </li>
            <li className={styles.step}>
              <strong>Or log a rep max</strong> — <code>exercise Nrm weight[unit]</code>, e.g.{' '}
              <code>comp squat 1rm 405lbs</code>.
            </li>
            <li>
              <strong>Add a date if you want one</strong> — drop a date anywhere in the line, e.g.{' '}
              <code>comp squat 405lbs x2 2024-11-04</code>. If omitted, it defaults to today.
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

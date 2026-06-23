import { EXAMPLE_SHEET_URL } from '../../utils/appUtils';
import styles from './GettingStarted.module.css';

/** Onboarding checklist shown before any sheet URL has been entered. */
export function GettingStarted() {
  return (
    <div className={styles.container}>
      <p className={styles.title}>Getting started</p>
      <ol className={styles.steps}>
        <li className={styles.step}>
          <strong>Set up your spreadsheet</strong> — your sheet needs columns for <code>date</code>,{' '}
          <code>exercise</code>, <code>weight</code>, and <code>reps</code>. Use the{' '}
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
          <strong>Paste the URL above</strong> — the published URL or your sheet's regular URL both
          work.
        </li>
      </ol>
      <p className={styles.footer}>
        Not sure if your sheet is compatible?{' '}
        <a href="?page=validator" className={styles.accentLink}>
          Run it through the validator.
        </a>
      </p>
    </div>
  );
}

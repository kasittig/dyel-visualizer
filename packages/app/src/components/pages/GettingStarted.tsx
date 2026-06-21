import { EXAMPLE_SHEET_URL } from '../../utils/appUtils';

/** Onboarding checklist shown before any sheet URL has been entered. */
export function GettingStarted() {
  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '1.5rem auto 0',
        textAlign: 'left',
        fontSize: '0.9rem',
        lineHeight: '1.7',
        color: 'var(--text-h)',
      }}
    >
      <p style={{ marginTop: 0, marginBottom: '0.75rem', fontWeight: 600 }}>Getting started</p>
      <ol style={{ paddingLeft: '1.4rem', margin: 0 }}>
        <li style={{ marginBottom: '0.5rem' }}>
          <strong>Set up your spreadsheet</strong> — your sheet needs columns for <code>date</code>,{' '}
          <code>exercise</code>, <code>weight</code>, and <code>reps</code>. Use the{' '}
          <a href={EXAMPLE_SHEET_URL} target="_blank" rel="noreferrer">
            example sheet
          </a>{' '}
          as a template.
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <strong>Publish to the web</strong> — in Google Sheets, go to{' '}
          <strong>File → Share → Publish to web</strong>, choose{' '}
          <em>Comma-separated values (.csv)</em>, and click Publish.
        </li>
        <li>
          <strong>Paste the URL above</strong> — the published URL or your sheet's regular URL both
          work.
        </li>
      </ol>
      <p style={{ marginTop: '0.85rem', marginBottom: 0, color: 'var(--text)' }}>
        Not sure if your sheet is compatible?{' '}
        <a href="?page=validator" style={{ color: 'var(--accent)' }}>
          Run it through the validator.
        </a>
      </p>
    </div>
  );
}

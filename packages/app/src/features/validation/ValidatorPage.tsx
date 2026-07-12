import { useState, useEffect, useRef, type CSSProperties } from 'react';
import clsx from 'clsx';
import { useSheetValidation } from './useSheetValidation';
import { useTextValidation } from './useTextValidation';
import type { ColumnInfo } from '@dyel/api';
import { EXAMPLE_SHEET_URL } from '../../features/data-source/sheetRef';
import type { InputMode } from '../../app/appTabs';
import { InputModeToggle } from '../../features/data-source/InputModeToggle';
import styles from './ValidatorPage.module.css';

const BANNERS = {
  ok: ['var(--success)', '✓', 'Your data is compatible with DYEL Visualizer.'],
  warning: [
    'var(--warning)',
    '⚠',
    'Your data will mostly work, but there are some issues to review.',
  ],
  error: ['var(--danger)', '✗', "Your data won't work with DYEL Visualizer. See the issues below."],
};

function IssueList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.issueHeading} style={{ '--issue-color': color } as CSSProperties}>
        {title}
      </h2>
      <ul className={styles.issueUl}>
        {items.map((item, i) => (
          <li key={i} className={styles.issueLi}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ValidatorPage() {
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState(
    () => new URLSearchParams(window.location.search).get('url') ?? ''
  );
  const [text, setText] = useState('');
  const [vState, validate] = useSheetValidation();
  const [tState, validateText] = useTextValidation();
  const autoValidated = useRef(false);

  useEffect(() => {
    if (!autoValidated.current && url.trim()) {
      autoValidated.current = true;
      validate(url);
    }
  }, [url, validate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'url') {
      validate(url);
    } else {
      validateText(text);
    }
  };

  const isDisabled = mode === 'url' ? !url.trim() || vState.status === 'loading' : !text.trim();
  const activeResult =
    mode === 'url' && vState.status === 'success'
      ? {
          ...vState.result,
          visualizerUrl: `${window.location.pathname}?sheet=${encodeURIComponent(vState.sheetUrl)}`,
        }
      : mode === 'text' && tState.status === 'success'
        ? {
            ...tState.result,
            visualizerUrl: `${window.location.pathname}?mode=text&text=${encodeURIComponent(text)}`,
          }
        : null;

  const [color, icon, msg] = activeResult ? BANNERS[activeResult.verdict] : ['', '', ''];
  const columns: ColumnInfo | null =
    activeResult && 'columns' in activeResult ? activeResult.columns : null;

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Sheet Validator</h1>
        <p className={styles.backLinkP}>
          <a href="./" className={styles.accentLink}>
            ← Back to DYEL Visualizer
          </a>
        </p>
      </div>
      <br />
      <p className={styles.introP}>
        {mode === 'url' ? (
          <>
            Paste your published Google Sheet URL below to check compatibility.{' '}
            <a
              href={EXAMPLE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.accentLink}
            >
              View example sheet.
            </a>
          </>
        ) : (
          "Paste your exercises below (one per line) to check if they're compatible with DYEL Visualizer."
        )}
      </p>
      <InputModeToggle mode={mode} onModeChange={setMode} />
      <form onSubmit={handleSubmit} className={styles.form}>
        {mode === 'url' ? (
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className={styles.urlInput}
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'comp squat 1rm 300lbs\ncomp bench 1rm 200lbs'}
            className={styles.textArea}
            rows={6}
          />
        )}
        <button
          type="submit"
          disabled={isDisabled}
          className={clsx(
            styles.submitButton,
            isDisabled ? styles.submitButtonDisabled : styles.submitButtonEnabled
          )}
        >
          {mode === 'url' && vState.status === 'loading'
            ? 'Checking…'
            : mode === 'url'
              ? 'Check Sheet'
              : 'Check Text'}
        </button>
      </form>
      {mode === 'url' && vState.status === 'error' && (
        <p className={styles.errorP}>{vState.message}</p>
      )}

      {activeResult && (
        <div>
          <div
            className={styles.verdictBanner}
            style={{ '--verdict-color': color } as CSSProperties}
          >
            <span className={styles.verdictIcon}>{icon}</span>
            <span className={styles.verdictMessage}>{msg}</span>
          </div>

          {columns && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Columns</h2>
              <ul className={styles.checklistUl}>
                {[
                  { label: 'exercise', ok: columns.hasExercise },
                  { label: 'date', ok: columns.hasDate },
                  {
                    label: columns.weightUnit
                      ? `weight (${columns.weightUnit})`
                      : columns.hasWeight
                        ? 'weight (no unit — assumes lbs)'
                        : 'weight',
                    ok: columns.hasWeight,
                  },
                  { label: 'reps', ok: columns.hasReps },
                  {
                    label: columns.hasSets ? 'sets' : 'sets (optional — defaults to 1)',
                    ok: true,
                  },
                ].map(({ label, ok }) => (
                  <li key={label} className={styles.checklistLi}>
                    <span className={clsx(styles.check, ok ? styles.checkOk : styles.checkFail)}>
                      {ok ? '✓' : '✗'}
                    </span>
                    <code>{label}</code>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeResult.rows.total > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Entries</h2>
              <p className={styles.rowCountP}>
                <strong>
                  {activeResult.rows.parsed} of {activeResult.rows.total}
                </strong>{' '}
                entries parsed{' '}
                {activeResult.rows.total - activeResult.rows.parsed > 0 && (
                  <span className={styles.skipped}>
                    ({activeResult.rows.total - activeResult.rows.parsed} skipped)
                  </span>
                )}
              </p>
              {activeResult.rows.parsed > 0 && (
                <ul className={styles.liftTypeUl}>
                  {(['squat', 'bench', 'deadlift', 'accessory'] as const).map((t) => (
                    <li key={t} className={styles.liftTypeLi}>
                      <span className={styles.liftTypeLabel}>{t}:</span>{' '}
                      <strong className={styles.liftTypeCount}>
                        {activeResult.rows.liftTypes[t]}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <IssueList title="Issues to Fix" items={activeResult.issues} color="var(--danger)" />

          {activeResult.rowIssues.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.dangerHeading}>Entry Issues</h2>
              <div className={styles.rowIssueStack}>
                {activeResult.rowIssues.map(({ row, exercise, issues }) => (
                  <div key={row} className={styles.rowIssueCard}>
                    <div className={styles.rowIssueHeader}>
                      Entry {row} <span className={styles.rowIssueExercise}>— {exercise}</span>
                    </div>
                    <ul className={styles.rowIssueUl}>
                      {issues.map((iss, i) => (
                        <li key={i} className={styles.rowIssueLi}>
                          {iss}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <IssueList title="Warnings" items={activeResult.warnings} color="var(--warning)" />
          {activeResult.rows.parsed > 0 && (
            <a href={activeResult.visualizerUrl} className={styles.visualizerLink}>
              View in Visualizer →
            </a>
          )}
        </div>
      )}
    </main>
  );
}

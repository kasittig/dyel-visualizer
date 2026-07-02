import { useState, useEffect, useRef, type CSSProperties } from 'react';
import clsx from 'clsx';
import { useSheetValidation } from '../../hooks/infra/useSheetValidation';
import { useTextValidation } from '../../hooks/infra/useTextValidation';
import type {
  SheetValidationResult,
  ColumnInfo,
  TextValidationResult,
  TextValidationIssue,
} from '@dyel/core';
import { EXAMPLE_SHEET_URL } from '../../utils/appUtils';
import type { InputMode } from '../../utils/appUtils';
import styles from './ValidatorPage.module.css';

function Check({ ok }: { ok: boolean }) {
  return (
    <span className={clsx(styles.check, ok ? styles.checkOk : styles.checkFail)}>
      {ok ? '✓' : '✗'}
    </span>
  );
}

const SHEET_VERDICT_MESSAGES = {
  ok: 'Your sheet is compatible with DYEL Visualizer.',
  warning: 'Your sheet will mostly work, but there are some issues to review.',
  error: "Your sheet won't work with DYEL Visualizer. See the issues below.",
};

const TEXT_VERDICT_MESSAGES = {
  ok: 'Your pasted text is compatible with DYEL Visualizer.',
  warning: 'Your pasted text will mostly work, but there are some issues to review.',
  error: "Your pasted text won't work with DYEL Visualizer. See the issues below.",
};

function VerdictBanner({
  verdict,
  messages,
}: {
  verdict: 'ok' | 'warning' | 'error';
  messages: { ok: string; warning: string; error: string };
}) {
  const color =
    verdict === 'ok'
      ? 'var(--success)'
      : verdict === 'warning'
        ? 'var(--warning)'
        : 'var(--danger)';
  const icon = verdict === 'ok' ? '✓' : verdict === 'warning' ? '⚠' : '✗';

  return (
    <div className={styles.verdictBanner} style={{ '--verdict-color': color } as CSSProperties}>
      <span className={styles.verdictIcon}>{icon}</span>
      <span className={styles.verdictMessage}>{messages[verdict]}</span>
    </div>
  );
}

function ColumnChecklist({ columns }: { columns: ColumnInfo }) {
  const weightLabel = columns.weightUnit
    ? `weight (${columns.weightUnit})`
    : columns.hasWeight
      ? 'weight (no unit — will assume lbs)'
      : 'weight';

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>Columns</h2>
      <ul className={styles.checklistUl}>
        {(
          [
            { label: 'exercise', ok: columns.hasExercise },
            { label: 'date', ok: columns.hasDate },
            { label: weightLabel, ok: columns.hasWeight },
            { label: 'reps', ok: columns.hasReps },
            {
              label: columns.hasSets ? 'sets' : 'sets (optional — not found, defaults to 1)',
              ok: true,
            },
          ] as const
        ).map(({ label, ok }) => (
          <li key={label} className={styles.checklistLi}>
            <Check ok={ok} />
            <code>{label}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowSummary({
  rows,
  unit = 'row',
}: {
  rows: SheetValidationResult['rows'] | TextValidationResult['lines'];
  unit?: 'row' | 'line';
}) {
  if (rows.total === 0) {
    return null;
  }
  const { total, parsed, liftTypes } = rows;
  const skipped = total - parsed;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHeading}>{unit === 'row' ? 'Rows' : 'Lines'}</h2>
      <p className={styles.rowCountP}>
        <strong>
          {parsed} of {total}
        </strong>{' '}
        {unit}
        {total === 1 ? '' : 's'} parsed successfully
        {skipped > 0 && <span className={styles.skipped}>({skipped} skipped)</span>}
      </p>
      {parsed > 0 && (
        <ul className={styles.liftTypeUl}>
          {(['squat', 'bench', 'deadlift', 'accessory'] as const).map((t) => (
            <li key={t} className={styles.liftTypeLi}>
              <span className={styles.liftTypeLabel}>{t}:</span>
              <strong className={styles.liftTypeCount}>{liftTypes[t]}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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

function RowIssueList({ rowIssues }: { rowIssues: SheetValidationResult['rowIssues'] }) {
  if (rowIssues.length === 0) {
    return null;
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.dangerHeading}>Row Issues</h2>
      <div className={styles.rowIssueStack}>
        {rowIssues.map(
          ({ row, exercise, issues }: { row: number; exercise: string; issues: string[] }) => (
            <div key={row} className={styles.rowIssueCard}>
              <div className={styles.rowIssueHeader}>
                Data row {row} <span className={styles.rowIssueExercise}>— {exercise}</span>
              </div>
              <ul className={styles.rowIssueUl}>
                {issues.map((issue: string, i: number) => (
                  <li key={i} className={styles.rowIssueLi}>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function ValidationResults({
  result,
  sheetUrl,
}: {
  result: SheetValidationResult;
  sheetUrl: string;
}) {
  const visualizerUrl = `${window.location.pathname}?sheet=${encodeURIComponent(sheetUrl)}`;

  return (
    <div>
      <VerdictBanner verdict={result.verdict} messages={SHEET_VERDICT_MESSAGES} />
      <ColumnChecklist columns={result.columns} />
      <RowSummary rows={result.rows} unit="row" />
      <IssueList title="Issues to Fix" items={result.issues} color="var(--danger)" />
      <RowIssueList rowIssues={result.rowIssues} />
      <IssueList title="Warnings" items={result.warnings} color="var(--warning)" />
      {result.rows.parsed > 0 && (
        <a href={visualizerUrl} className={styles.visualizerLink}>
          View in Visualizer →
        </a>
      )}
    </div>
  );
}

function LineIssueList({ lineIssues }: { lineIssues: TextValidationIssue[] }) {
  if (lineIssues.length === 0) {
    return null;
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.dangerHeading}>Line Issues</h2>
      <div className={styles.rowIssueStack}>
        {lineIssues.map(({ line, exercise, issues }) => (
          <div key={line} className={styles.rowIssueCard}>
            <div className={styles.rowIssueHeader}>
              Line {line} <span className={styles.rowIssueExercise}>— {exercise}</span>
            </div>
            <ul className={styles.rowIssueUl}>
              {issues.map((issue, i) => (
                <li key={i} className={styles.rowIssueLi}>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function TextValidationResults({ result, text }: { result: TextValidationResult; text: string }) {
  const visualizerUrl = `${window.location.pathname}?mode=text&text=${encodeURIComponent(text)}`;

  return (
    <div>
      <VerdictBanner verdict={result.verdict} messages={TEXT_VERDICT_MESSAGES} />
      <RowSummary rows={result.lines} unit="line" />
      <IssueList title="Issues to Fix" items={result.issues} color="var(--danger)" />
      <LineIssueList lineIssues={result.lineIssues} />
      <IssueList title="Warnings" items={result.warnings} color="var(--warning)" />
      {result.lines.parsed > 0 && (
        <a href={visualizerUrl} className={styles.visualizerLink}>
          View in Visualizer →
        </a>
      )}
    </div>
  );
}

export function ValidatorPage() {
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState(
    () => new URLSearchParams(window.location.search).get('url') ?? ''
  );
  const [text, setText] = useState('');
  const [validationState, validate] = useSheetValidation();
  const [textValidationState, validateText] = useTextValidation();
  const autoValidated = useRef(false);

  useEffect(() => {
    if (!autoValidated.current && url.trim()) {
      autoValidated.current = true;
      validate(url);
    }
  }, [url, validate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'url') {
      validate(url);
    } else {
      validateText(text);
    }
  }

  const isDisabled =
    mode === 'url' ? !url.trim() || validationState.status === 'loading' : !text.trim();

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
            Paste your published Google Sheet URL below to check if it's compatible with DYEL
            Visualizer.
            <br /> <br />
            Don't have a sheet yet?{' '}
            <a
              href={EXAMPLE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.accentLink}
            >
              View the example spreadsheet.
            </a>
          </>
        ) : (
          "Paste your exercises below (one per line) to check if they're compatible with DYEL Visualizer."
        )}
      </p>

      <div className={styles.modeToggle} role="tablist" aria-label="Data source">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          className={clsx(styles.modeButton, mode === 'url' && styles.modeButtonActive)}
          onClick={() => setMode('url')}
        >
          Sheet URL
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'text'}
          className={clsx(styles.modeButton, mode === 'text' && styles.modeButtonActive)}
          onClick={() => setMode('text')}
        >
          Paste text
        </button>
      </div>

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
          {mode === 'url' && validationState.status === 'loading'
            ? 'Checking…'
            : mode === 'url'
              ? 'Check Sheet'
              : 'Check Text'}
        </button>
      </form>

      {mode === 'url' && validationState.status === 'error' && (
        <p className={styles.errorP}>{validationState.message}</p>
      )}

      {mode === 'url' && validationState.status === 'success' && (
        <ValidationResults result={validationState.result} sheetUrl={validationState.sheetUrl} />
      )}

      {mode === 'text' && textValidationState.status === 'success' && (
        <TextValidationResults result={textValidationState.result} text={text} />
      )}
    </main>
  );
}

import { useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import { usePipelineValidation } from '../../hooks/infra/usePipelineValidation';
import type { InputMode } from '../../utils/appUtils';
import { InputModeToggle } from '../shared/InputModeToggle';
import styles from './PipelineValidationPage.module.css';

function VerdictBanner({ verdict }: { verdict: 'ok' | 'warning' | 'error' }) {
  const color =
    verdict === 'ok'
      ? 'var(--success)'
      : verdict === 'warning'
        ? 'var(--warning)'
        : 'var(--danger)';
  const icon = verdict === 'ok' ? '✓' : verdict === 'warning' ? '⚠' : '✗';

  const messages = {
    ok: 'Your pipeline data is valid.',
    warning: 'Your data parsed, but there are issues to review.',
    error: 'Your data failed to parse. See the errors below.',
  };

  return (
    <div className={styles.verdictBanner} style={{ '--verdict-color': color } as CSSProperties}>
      <span className={styles.verdictIcon}>{icon}</span>
      <span className={styles.verdictMessage}>{messages[verdict]}</span>
    </div>
  );
}

function ParseErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return null;
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.dangerHeading}>Parse Errors</h2>
      <ul className={styles.issueUl}>
        {errors.map((error, i) => (
          <li key={i} className={styles.issueLi}>
            {error}
          </li>
        ))}
      </ul>
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

function ResultsPanel({
  verdict,
  parseErrors,
  unknownExercises,
  unnormalized,
}: {
  verdict: 'ok' | 'warning' | 'error';
  parseErrors: string[];
  unknownExercises: string[];
  unnormalized: string[];
}) {
  return (
    <div>
      <VerdictBanner verdict={verdict} />
      <ParseErrorList errors={parseErrors} />
      <IssueList title="Unknown Exercises" items={unknownExercises} color="var(--warning)" />
      <IssueList title="Unnormalized" items={unnormalized} color="var(--warning)" />
    </div>
  );
}

export function PipelineValidationPage() {
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const { state, validateUrl, validateText } = usePipelineValidation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'url') {
      validateUrl(url);
    } else {
      validateText(text);
    }
  }

  const isDisabled = mode === 'url' ? !url.trim() || state.status === 'loading' : !text.trim();

  const activeResult =
    mode === 'url' && state.status === 'success'
      ? state.result
      : mode === 'text' && state.status === 'success'
        ? state.result
        : null;

  const verdict = activeResult
    ? activeResult.parseErrors.length > 0
      ? 'error'
      : activeResult.unknownExercises.length > 0 || activeResult.unnormalized.length > 0
        ? 'warning'
        : 'ok'
    : null;

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Pipeline Validation</h1>
        <p className={styles.backLinkP}>
          <a href="./" className={styles.accentLink}>
            ← Back to DYEL Visualizer
          </a>
        </p>
      </div>
      <br />

      <p className={styles.introP}>
        {mode === 'url' ? (
          <>Paste a CSV URL to validate its pipeline parsing.</>
        ) : (
          <>Paste exercise logs to validate their pipeline parsing.</>
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
          {state.status === 'loading' ? 'Validating…' : 'Validate'}
        </button>
      </form>

      {state.status === 'error' && <p className={styles.errorP}>{state.message}</p>}

      {activeResult && verdict && (
        <ResultsPanel
          verdict={verdict}
          parseErrors={activeResult.parseErrors.map((e) => e.toString())}
          unknownExercises={activeResult.unknownExercises}
          unnormalized={activeResult.unnormalized}
        />
      )}
    </main>
  );
}

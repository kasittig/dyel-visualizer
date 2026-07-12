import { useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import { usePipelineValidation } from './usePipelineValidation';
import type { InputMode } from '../../app/appTabs';
import { InputModeToggle } from '../../features/data-source/InputModeToggle';
import styles from './PipelineValidationPage.module.css';

const BANNERS = {
  ok: ['var(--success)', '✓', 'Your pipeline data is valid.'],
  warning: ['var(--warning)', '⚠', 'Your data parsed, but there are issues to review.'],
  error: ['var(--danger)', '✗', 'Your data failed to parse. See the errors below.'],
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

export function PipelineValidationPage() {
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const { state, validateUrl, validateText, verdict } = usePipelineValidation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'url') {
      validateUrl(url);
    } else {
      validateText(text);
    }
  };

  const isDisabled = mode === 'url' ? !url.trim() || state.status === 'loading' : !text.trim();
  const activeResult = state.status === 'success' ? state.result : null;
  const [color, icon, msg] = verdict ? BANNERS[verdict] : ['', '', ''];

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
        Paste {mode === 'url' ? 'a CSV URL' : 'exercise logs'} to validate pipeline parsing.
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
        <div>
          <div
            className={styles.verdictBanner}
            style={{ '--verdict-color': color } as CSSProperties}
          >
            <span className={styles.verdictIcon}>{icon}</span>
            <span className={styles.verdictMessage}>{msg}</span>
          </div>
          <IssueList
            title="Parse Errors"
            items={activeResult.parseErrors.map((e) => e.toString())}
            color="var(--danger)"
          />
          <IssueList
            title="Unknown Exercises"
            items={activeResult.unknownExercises}
            color="var(--warning)"
          />
          <IssueList
            title="Unnormalized"
            items={activeResult.unnormalized}
            color="var(--warning)"
          />
        </div>
      )}
    </main>
  );
}

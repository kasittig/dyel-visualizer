import { useState } from 'react';
import clsx from 'clsx';
import { extractTextLines } from '@dyel/core';
import styles from './TextInputPage.module.css';

type ExtractState =
  | { status: 'idle' }
  | { status: 'empty' }
  | { status: 'success'; lines: string[] };

export function TextInputPage() {
  const [text, setText] = useState('');
  const [extractState, setExtractState] = useState<ExtractState>({ status: 'idle' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = extractTextLines(text);
    setExtractState(lines ? { status: 'success', lines } : { status: 'empty' });
  }

  const isDisabled = !text.trim();

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Paste Exercise Text</h1>
        <p className={styles.backLinkP}>
          <a href="./" className={styles.accentLink}>
            ← Back to DYEL Visualizer
          </a>
        </p>
      </div>
      <br />

      <p className={styles.introP}>
        Paste one exercise per line (e.g. <code>comp squat 1rm 300lbs</code>) below.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'comp squat 1rm 300lbs\ncomp bench 1rm 200lbs'}
          className={styles.textArea}
          rows={10}
        />
        <button
          type="submit"
          disabled={isDisabled}
          className={clsx(
            styles.submitButton,
            isDisabled ? styles.submitButtonDisabled : styles.submitButtonEnabled
          )}
        >
          Extract Lines
        </button>
      </form>

      {extractState.status === 'empty' && (
        <p className={styles.errorP}>No usable lines found in the pasted text.</p>
      )}

      {extractState.status === 'success' && (
        <ul className={styles.lineList}>
          {extractState.lines.map((line, i) => (
            <li key={i} className={styles.lineItem}>
              {line}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

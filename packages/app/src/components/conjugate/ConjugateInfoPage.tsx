import ReactMarkdown from 'react-markdown';
import conjugateContent from '../../../CONJUGATE.md?raw';
import styles from './ConjugateInfoPage.module.css';

export function ConjugateInfoPage() {
  return (
    <main className={styles.conjugateInfoPage}>
      <p className={styles.backLink}>
        <a href="." className={styles.accentLink}>
          ← Back to DYEL Visualizer
        </a>
      </p>
      <div className={styles.conjugateInfoContent}>
        <ReactMarkdown>{conjugateContent}</ReactMarkdown>
      </div>
    </main>
  );
}

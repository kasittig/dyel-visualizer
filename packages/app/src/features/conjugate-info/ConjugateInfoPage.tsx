import ReactMarkdown from 'react-markdown';
import conjugateContent from '../../../CONJUGATE.md?raw';
import styles from './ConjugateInfoPage.module.css';
import { siteRootPath } from '../../shared/pageRouting';

export function ConjugateInfoPage() {
  return (
    <main className={styles.conjugateInfoPage}>
      <p className={styles.backLink}>
        <a href={`${siteRootPath()}?page=learn`} className={styles.accentLink}>
          ← Back to Learn
        </a>
      </p>
      <div className={styles.conjugateInfoContent}>
        <ReactMarkdown>{conjugateContent}</ReactMarkdown>
      </div>
    </main>
  );
}

import { siteRootPath } from '../../shared/pageRouting';
import styles from './ExerciseAlternativesPage.module.css';

export function ExerciseAlternativesPage() {
  return (
    <main className={styles.page}>
      <a href={siteRootPath()} className={styles.backLink}>
        ← Back to DYEL Visualizer
      </a>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Exercise guide</p>
        <h1>Exercise alternatives</h1>
        <p>
          Find another movement that fits your training needs. No training sheet is required to use
          this guide.
        </p>
      </header>
      <section className={styles.formPlaceholder} aria-labelledby="alternatives-form-heading">
        <h2 id="alternatives-form-heading">Find an alternative</h2>
        <p>The exercise search and recommendation form will appear here.</p>
      </section>
    </main>
  );
}

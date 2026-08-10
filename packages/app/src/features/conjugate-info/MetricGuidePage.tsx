import { siteRootPath } from '../../shared/pageRouting';
import styles from './MetricGuidePage.module.css';

export function MetricGuidePage() {
  return (
    <main className={styles.page}>
      <a href={`${siteRootPath()}?page=learn`} className={styles.backLink}>
        ← Back to Learn
      </a>
      <section className={styles.guide} aria-labelledby="metric-guide-title">
        <h1 id="metric-guide-title">Reading your training data</h1>
        <dl>
          <div>
            <dt>e1RM</dt>
            <dd>An estimated one-rep max calculated from the weight, reps, and effort you log.</dd>
          </div>
          <div>
            <dt>Normalization</dt>
            <dd>
              Adjusts lift variations to a common baseline so their strength trends compare fairly.
            </dd>
          </div>
          <div>
            <dt>Overview</dt>
            <dd>Summarizes your competition-lift balance, total strength, and training volume.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

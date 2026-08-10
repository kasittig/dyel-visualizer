import { siteRootPath } from '../../shared/pageRouting';
import styles from './LearnPage.module.css';

export function LearnPage() {
  const root = siteRootPath();

  return (
    <main className={styles.page}>
      <nav className={styles.guideGrid} aria-label="Learning guides">
        <a className={styles.guideCard} href={`${root}?page=conjugate`}>
          <span>Method guide</span>
          <strong>Understanding the conjugate method</strong>
          <p>Learn how max effort, dynamic effort, repetition work, and exercise rotation fit.</p>
        </a>
        <a className={styles.guideCard} href={`${root}?page=tools&tool=alternatives`}>
          <span>Practical guide</span>
          <strong>Choose an exercise alternative</strong>
          <p>Find a similar movement when equipment, comfort, or training goals change.</p>
        </a>
        <a className={styles.guideCard} href={`${root}?page=metrics`}>
          <span>Metric guide</span>
          <strong>Reading your training data</strong>
          <p>Understand e1RM, normalization, and the Overview metrics.</p>
        </a>
      </nav>
    </main>
  );
}

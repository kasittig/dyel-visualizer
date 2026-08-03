import { useLocalStorageState } from '../shared/hooks';
import styles from './FirstUseGuide.module.css';

const GUIDE_ID = 'metric-guide';

export function FirstUseGuide() {
  const [dismissed, setDismissed] = useLocalStorageState('dyel:metricGuideDismissed', false);
  const open = !dismissed;

  return (
    <div className={styles.guideShell}>
      <button
        type="button"
        className={styles.guideToggle}
        aria-expanded={open}
        aria-controls={GUIDE_ID}
        onClick={() => setDismissed(open)}
      >
        {open ? 'Hide metric guide' : 'Metric guide'}
      </button>
      {open && (
        <div id={GUIDE_ID} className={styles.guide} role="region" aria-labelledby="guide-title">
          <div className={styles.guideHeading}>
            <div>
              <p className={styles.eyebrow}>Quick guide</p>
              <h2 id="guide-title" className={styles.title}>
                Reading your training data
              </h2>
            </div>
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Dismiss metric guide"
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </button>
          </div>
          <dl className={styles.terms}>
            <div>
              <dt>e1RM</dt>
              <dd>An estimated one-rep max calculated from the weight, reps, and effort you log.</dd>
            </div>
            <div>
              <dt>Normalization</dt>
              <dd>Adjusts lift variations to a common baseline so their strength trends compare fairly.</dd>
            </div>
            <div>
              <dt>Overview</dt>
              <dd>Summarizes your competition-lift balance, total strength, and training volume.</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

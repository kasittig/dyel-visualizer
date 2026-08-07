import type { CategoryEffectivenessView } from './useCategoryEffectivenessEvidence';
import styles from './CategoryEffectivenessEvidence.module.css';

export function CategoryEffectivenessEvidence({
  evidence,
}: {
  evidence: CategoryEffectivenessView;
}) {
  return (
    <section className={styles.section} aria-labelledby="category-effectiveness-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Earlier work → later signal</p>
          <h3 id="category-effectiveness-heading">Category effectiveness evidence</h3>
        </div>
        <p>{evidence.windowPolicy}</p>
      </header>
      <p className={styles.caution}>
        These are category-level associations, not proof that accessory work caused a change. No
        individual exercise receives credit.
      </p>
      {evidence.unavailableReason && !evidence.rows.length ? (
        <p className={styles.empty}>{evidence.unavailableReason}</p>
      ) : (
        <ul className={styles.list}>
          {evidence.rows.map((row) => (
            <li key={row.id} className={styles.card} data-status={row.status}>
              <div className={styles.cardHeading}>
                <div>
                  <span>{row.categoryLabel}</span>
                  <h4>{row.qualityLabel}</h4>
                </div>
                <strong>{row.statusLabel}</strong>
              </div>
              <div className={styles.timeline} aria-label={`${row.categoryLabel} analysis periods`}>
                <div>
                  <span>Exposure</span>
                  <strong>{row.exposurePeriod}</strong>
                  <small>{row.sessionSummary}</small>
                </div>
                <span aria-hidden="true">→</span>
                <div>
                  <span>Later follow-up</span>
                  <strong>{row.outcomePeriod}</strong>
                  <small>{row.evidenceSummary}</small>
                </div>
              </div>
              <dl className={styles.metrics}>
                <div>
                  <dt>Baseline</dt>
                  <dd>{row.baselineDisplay}</dd>
                </div>
                <div>
                  <dt>Follow-up</dt>
                  <dd>{row.outcomeDisplay}</dd>
                </div>
                <div>
                  <dt>Change</dt>
                  <dd>{row.changeDisplay}</dd>
                </div>
              </dl>
              <details>
                <summary>Inspect lift evidence</summary>
                <p>{row.evidenceSummary}</p>
                <p>{row.interpretation} This describes timing and association only.</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

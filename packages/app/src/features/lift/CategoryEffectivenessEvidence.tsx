import type {
  CategoryEffectivenessRow,
  CategoryEffectivenessView,
} from './useCategoryEffectivenessEvidence';
import styles from './CategoryEffectivenessEvidence.module.css';

export function CategoryEffectivenessGuide({ evidence }: { evidence: CategoryEffectivenessView }) {
  return (
    <details className={styles.guide}>
      <summary>How effectiveness evidence works</summary>
      <p>{evidence.windowPolicy}</p>
      <p>
        Evidence appears inside its accessory category. These are category-level associations, not
        proof that accessory work caused a change. No individual exercise receives credit.
      </p>
      <p>
        Minimum evidence: 1 category session and 1 usable lift-quality observation in the earlier
        period, plus 1 usable lift-quality observation in the later follow-up.
      </p>
      {evidence.unavailableReason && <p>{evidence.unavailableReason}</p>}
    </details>
  );
}

export function CategoryEffectivenessEvidence({ rows }: { rows: CategoryEffectivenessRow[] }) {
  if (!rows.length) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="Category effectiveness evidence">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Earlier work → later signal</p>
          <h4>Effectiveness evidence</h4>
        </div>
        <span>
          {rows.length} association{rows.length === 1 ? '' : 's'}
        </span>
      </header>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id} className={styles.card} data-status={row.status}>
            <div className={styles.cardHeading}>
              <h5>{row.qualityLabel}</h5>
              <strong>{row.statusLabel}</strong>
            </div>
            <p className={styles.compactSummary}>{row.sessionSummary}</p>
            {row.requirementDisplay && (
              <p className={styles.requirement}>{row.requirementDisplay}</p>
            )}
            <details className={styles.evidenceDetails}>
              <summary>View periods and evidence</summary>
              <div className={styles.timeline} aria-label={`${row.qualityLabel} analysis periods`}>
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
              <p>{row.evidenceSummary}</p>
              <p>{row.interpretation} This describes timing and association only.</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

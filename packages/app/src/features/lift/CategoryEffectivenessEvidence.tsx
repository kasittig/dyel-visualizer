import type {
  CategoryEffectivenessRow,
  CategoryEffectivenessView,
} from './useCategoryEffectivenessEvidence';
import styles from './CategoryEffectivenessEvidence.module.css';

export function CategoryEffectivenessGuide({ evidence }: { evidence: CategoryEffectivenessView }) {
  return (
    <details className={styles.guide}>
      <summary>How to read these associations</summary>
      <p>{evidence.windowPolicy}</p>
      <ol>
        <li>Count category sessions in the earlier half of the selected period.</li>
        <li>Compare the linked lift-quality score from earlier to later.</li>
        <li>A higher later score suggests improvement; a lower score suggests worsening.</li>
      </ol>
      <p className={styles.caution}>
        This is a timing clue, not proof of cause. Other training may explain the change, and no
        individual exercise receives credit.
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
          <p className={styles.eyebrow}>Category sessions first → lift-quality score later</p>
          <h4>Association evidence</h4>
        </div>
        <span>
          {rows.length} association{rows.length === 1 ? '' : 's'}
        </span>
      </header>
      <p className={styles.readingKey}>
        Read each card as a sequence: category work happened in the earlier period, then the linked
        quality was measured later. 100% means the linked variations performed exactly as expected
        from the competition lift; higher percentages are better. Association does not prove the
        category caused the change.
      </p>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id} className={styles.card} data-status={row.status}>
            <div className={styles.cardHeading}>
              <h5>{row.qualityLabel}</h5>
              <strong>{row.statusLabel}</strong>
            </div>
            <p className={styles.compactSummary}>{row.sessionSummary}</p>
            <p className={styles.resultSummary}>{row.resultSummary}</p>
            {row.requirementDisplay && (
              <p className={styles.requirement}>{row.requirementDisplay}</p>
            )}
            <details className={styles.evidenceDetails}>
              <summary>See dates, sample size, and calculation</summary>
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
                  <dt>Earlier performance</dt>
                  <dd>{row.baselineDisplay}</dd>
                </div>
                <div>
                  <dt>Later performance</dt>
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

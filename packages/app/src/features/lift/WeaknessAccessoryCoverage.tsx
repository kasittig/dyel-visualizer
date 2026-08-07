import type { WeaknessCoverageRow } from './useWeaknessAccessoryCoverage';
import styles from './WeaknessAccessoryCoverage.module.css';

export function WeaknessAccessoryCoverage({ rows }: { rows: WeaknessCoverageRow[] }) {
  return (
    <section className={styles.section} aria-labelledby="weakness-coverage-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Diagnostic associations</p>
          <h3 id="weakness-coverage-heading">Weakness coverage</h3>
        </div>
        <p>
          Compare detected training qualities with the accessory categories logged in this range.
        </p>
      </header>
      {!rows.length ? (
        <p className={styles.empty}>
          No current weakness signals are available to compare with accessory training.
        </p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.effect} className={styles.trace}>
              <div className={styles.quality}>
                <span>Detected quality</span>
                <strong>{row.effectLabel}</strong>
                <details>
                  <summary>Evidence · {row.evidenceSummary}</summary>
                  <p>
                    This diagnostic pattern is associated with the quality label; it does not show
                    that any accessory caused or corrected the result.
                  </p>
                </details>
              </div>
              <div className={styles.mapping}>
                <span>Reviewed category association</span>
                {row.categories.length ? (
                  <div className={styles.categories}>
                    {row.categories.map((category) => (
                      <article key={category.category}>
                        <h4>{category.label}</h4>
                        {category.recentExposure.length ? (
                          <ul
                            className={styles.weeks}
                            aria-label={`${category.label} sessions by week`}
                          >
                            {category.recentExposure.map((week) => (
                              <li key={week.weekStart}>
                                <span>Week of {week.weekLabel}</span>
                                <strong>{week.sessionCount}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.noExposure}>No classified sessions in this range.</p>
                        )}
                        <p className={styles.exercises}>
                          {category.contributingExercises.length
                            ? `Contributing exercises: ${category.contributingExercises.join(', ')}`
                            : 'No contributing exercises were classified in this range.'}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className={styles.unavailable}>
                    {row.status === 'unsupported'
                      ? 'This quality does not have a safe broad-category association.'
                      : 'This quality is not available in the reviewed association map.'}
                  </p>
                )}
                <p className={styles.rationale}>{row.rationale}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

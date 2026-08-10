import { siteRootPath } from '../../shared/pageRouting';
import { TypeaheadDropdown } from '../../shared/components';
import type { ExerciseIssueCategory, ExerciseIssueId, ExerciseRecommendation } from '@dyel/api';
import { useExerciseAlternatives } from './useExerciseAlternatives';
import styles from './ExerciseAlternativesPage.module.css';

function RecommendationList({
  heading,
  recommendations,
  emptyMessage,
}: {
  heading: string;
  recommendations: ExerciseRecommendation[];
  emptyMessage: string;
}) {
  return (
    <section
      className={styles.resultGroup}
      aria-labelledby={`${heading.replaceAll(' ', '-')}-heading`}
    >
      <h3 id={`${heading.replaceAll(' ', '-')}-heading`}>{heading}</h3>
      {recommendations.length ? (
        <ul className={styles.resultList}>
          {recommendations.map((recommendation) => (
            <li key={recommendation.id} className={styles.resultCard}>
              <h4>{recommendation.title}</h4>
              <dl>
                <div>
                  <dt>Why it helps</dt>
                  <dd>{recommendation.whyItHelps}</dd>
                </div>
                <div>
                  <dt>What stays similar</dt>
                  <dd>{recommendation.staysSimilar}</dd>
                </div>
                <div>
                  <dt>What changes</dt>
                  <dd>{recommendation.changes}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyGroup}>{emptyMessage}</p>
      )}
    </section>
  );
}

export function ExerciseAlternativesPage() {
  const alternatives = useExerciseAlternatives();

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

      <section className={styles.finder} aria-labelledby="alternatives-form-heading">
        <h2 id="alternatives-form-heading">Find an alternative</h2>
        <div className={styles.controlGroup}>
          <label htmlFor="exercise-search">Exercise</label>
          <TypeaheadDropdown
            key={alternatives.exerciseName ?? 'no-exercise'}
            inputId="exercise-search"
            options={alternatives.exerciseOptions}
            getSearchText={alternatives.getExerciseSearchText}
            getGroupLabel={alternatives.getExerciseGroupLabel}
            value={alternatives.exerciseName}
            onChange={alternatives.selectExercise}
            placeholder="Search exercises"
            emptyMessage="No exercises match your search"
          />
          <p className={styles.hint}>Search by exercise name or a common alias.</p>
        </div>

        {alternatives.exerciseName ? (
          <fieldset className={styles.choiceGroup}>
            <legend>What needs to change?</legend>
            <div className={styles.choiceGrid}>
              {alternatives.categoryOptions.map((choice) => (
                <label key={choice.value} className={styles.choice}>
                  <input
                    type="radio"
                    name="issue-category"
                    value={choice.value}
                    checked={alternatives.category === choice.value}
                    onChange={() =>
                      alternatives.selectCategory(choice.value as ExerciseIssueCategory)
                    }
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className={styles.initialState}>
            Choose an exercise to see the issues we can help with.
          </p>
        )}

        {alternatives.category && alternatives.directionOptions.length > 0 && (
          <fieldset className={styles.choiceGroup}>
            <legend>Which direction?</legend>
            <div className={styles.choiceGrid}>
              {alternatives.directionOptions.map((choice) => (
                <label key={choice.value} className={styles.choice}>
                  <input
                    type="radio"
                    name="issue-direction"
                    value={choice.value}
                    checked={alternatives.issueId === choice.value}
                    onChange={() => alternatives.selectDirection(choice.value as ExerciseIssueId)}
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {(alternatives.exerciseName || alternatives.category) && (
          <button type="button" className={styles.resetButton} onClick={alternatives.reset}>
            Start over
          </button>
        )}
      </section>

      <div className={styles.liveRegion} aria-live="polite" aria-atomic="true">
        {alternatives.issueId
          ? alternatives.hasRecommendations
            ? `${alternatives.results.adjustments.length + alternatives.results.replacements.length} recommendations available.`
            : 'No recommendations are available for this choice.'
          : ''}
      </div>

      {alternatives.issueId && (
        <section className={styles.results} aria-labelledby="recommendations-heading">
          <h2 id="recommendations-heading">Recommendations</h2>
          {alternatives.hasRecommendations ? (
            <>
              <RecommendationList
                heading="Adjust this exercise"
                recommendations={alternatives.results.adjustments}
                emptyMessage="No adjustments are available for this issue."
              />
              <RecommendationList
                heading="Try another exercise"
                recommendations={alternatives.results.replacements}
                emptyMessage="No replacement exercises are available for this issue."
              />
            </>
          ) : (
            <p className={styles.noRecommendations}>
              No recommendations are available for this combination yet. Try another issue.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

import type { CSSProperties } from 'react';
import { CollapsibleSection } from '../../shared/components/CollapsibleSection';
import { usePlateCalculator } from './usePlateCalculator';
import styles from './PlateCalculator.module.css';

interface DisplayPlate {
  weight: number;
  style: 'calibrated' | 'iron';
  color?: string;
}

const PLATE_APPEARANCE: Record<string, { background: string; text: string }> = {
  red: { background: '#c52f36', text: '#ffffff' },
  blue: { background: '#255898', text: '#ffffff' },
  yellow: { background: '#e8bc32', text: '#161616' },
  green: { background: '#2f8654', text: '#ffffff' },
  white: { background: '#f5f3ee', text: '#161616' },
  black: { background: '#1e2024', text: '#ffffff' },
  grey: { background: '#8d929a', text: '#161616' },
  iron: { background: '#34363b', text: '#ffffff' },
};

function plateAppearance(plate: DisplayPlate) {
  return PLATE_APPEARANCE[plate.color ?? 'iron']!;
}

function plateDescription(plate: DisplayPlate) {
  return `${plate.weight} lb ${
    plate.style === 'iron' ? 'standard iron' : `${plate.color} calibrated`
  } plate`;
}

function plateStyle(plate: DisplayPlate): CSSProperties {
  const appearance = plateAppearance(plate);
  return {
    '--plate-bg': appearance.background,
    '--plate-text': appearance.text,
  } as CSSProperties;
}

function PlateStack({ plates, side }: { plates: readonly DisplayPlate[]; side: 'left' | 'right' }) {
  return (
    <div className={`${styles.sleeve} ${side === 'left' ? styles.leftSleeve : styles.rightSleeve}`}>
      {plates.map((plate, index) => (
        <span
          key={`${plate.weight}-${index}`}
          className={styles.plate}
          data-weight={plate.weight}
          style={plateStyle(plate)}
        >
          <span className={styles.plateWeight}>{plate.weight}</span>
        </span>
      ))}
    </div>
  );
}

/** Self-contained plate loading utility; all selection and validation is adapted by its feature hook. */
export function PlateCalculator() {
  const {
    targetWeight,
    setTargetWeight,
    targetUnit,
    setTargetUnit,
    barWeight,
    setBarWeight,
    plateSet,
    setPlateSet,
    inventory,
    result,
    sidePlateGroups,
    loadedTotalDisplay,
    loadedTotalSecondary,
    differenceDisplay,
    differenceSecondary,
    isLoadable,
    isExact,
    message,
  } = usePlateCalculator();
  const isInvalid = !isLoadable;

  return (
    <div className={styles.shell}>
      <CollapsibleSection label="Plate Calculator" persistenceId="visualizer:calculator:plate">
        <section className={styles.card} aria-label="Barbell plate calculator">
          <header className={styles.masthead}>
            <div>
              <span className={styles.eyebrow}>Loading bay</span>
              <p className={styles.mastheadTitle}>Symmetrical barbell setup</p>
            </div>
            <span className={styles.mastheadNote}>Plate + bar inventory in lb</span>
          </header>
          <div className={styles.body}>
            <div className={styles.controls}>
              <div className={styles.field}>
                <div className={styles.fieldHeading}>
                  <label className={styles.fieldLabel} htmlFor="plate-target-weight">
                    Target weight ({targetUnit === 'lbs' ? 'lb' : 'kg'})
                  </label>
                  <div className={styles.unitChoices} role="group" aria-label="Target weight unit">
                    {(['lbs', 'kg'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        className={styles.unitChoice}
                        aria-pressed={targetUnit === unit}
                        onClick={() => setTargetUnit(unit)}
                      >
                        {unit === 'lbs' ? 'lb' : 'kg'}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  id="plate-target-weight"
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={targetWeight}
                  onChange={(event) => setTargetWeight(event.target.value)}
                  placeholder="e.g. 225"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="plate-bar-weight">
                  Bar weight (lb)
                </label>
                <input
                  id="plate-bar-weight"
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={barWeight}
                  onChange={(event) => setBarWeight(event.target.value)}
                />
              </div>
              <fieldset className={styles.plateSet}>
                <legend className={`${styles.fieldLabel} ${styles.plateSetLegend}`}>
                  Plate set
                </legend>
                <div className={styles.setChoices}>
                  <button
                    type="button"
                    className={styles.setChoice}
                    aria-pressed={plateSet === 'calibrated'}
                    onClick={() => setPlateSet('calibrated')}
                  >
                    Calibrated
                  </button>
                  <button
                    type="button"
                    className={styles.setChoice}
                    aria-pressed={plateSet === 'iron'}
                    onClick={() => setPlateSet('iron')}
                  >
                    Standard iron
                  </button>
                </div>
              </fieldset>
            </div>
            <div className={styles.result} aria-live="polite" aria-atomic="true">
              {isInvalid ? (
                <div className={styles.invalid} role="status">
                  <span className={styles.resultLabel}>Adjust the load</span>
                  <p className={styles.resultMessage}>{message}</p>
                </div>
              ) : (
                <>
                  <div className={styles.totalReadout}>
                    <span className={styles.resultLabel}>
                      {isExact ? 'Exact loaded total' : 'Closest loaded total'}
                    </span>
                    <output className={styles.totalValue}>{loadedTotalDisplay}</output>
                    {loadedTotalSecondary && (
                      <span className={styles.conversion}>{loadedTotalSecondary}</span>
                    )}
                    <span className={styles.totalSubline}>
                      {isExact ? (
                        'Matches your target exactly.'
                      ) : (
                        <>
                          <span className={styles.difference}>{differenceDisplay}</span> from target
                          {differenceSecondary && ` (${differenceSecondary})`}; plate selection
                          never exceeds it.
                        </>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className={styles.resultLabel}>Load each side</span>
                    {sidePlateGroups.length === 0 ? (
                      <p className={styles.emptyLoad}>
                        No plates needed — the target equals the bar weight.
                      </p>
                    ) : (
                      <ul className={styles.loadList}>
                        {sidePlateGroups.map(({ plate, count }) => {
                          const appearance = plateAppearance(plate);
                          return (
                            <li key={plate.weight} className={styles.loadItem}>
                              <span
                                className={styles.swatch}
                                aria-hidden="true"
                                style={
                                  {
                                    '--swatch-bg': appearance.background,
                                    '--swatch-text': appearance.text,
                                  } as CSSProperties
                                }
                              />
                              <span className={styles.loadText}>
                                {count} × {plateDescription(plate)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className={styles.barbell} aria-hidden="true">
                    <div className={styles.assembly}>
                      <PlateStack plates={result.plates} side="left" />
                      <div className={styles.bar} />
                      <PlateStack plates={result.plates} side="right" />
                    </div>
                  </div>
                  <div className={styles.legend} aria-hidden="true">
                    <span className={styles.legendTitle}>
                      {plateSet === 'calibrated' ? 'Calibrated colors' : 'Iron finish'}
                    </span>
                    {inventory.map((plate) => {
                      const appearance = plateAppearance(plate);
                      return (
                        <span key={plate.weight} className={styles.legendItem}>
                          <span
                            className={styles.swatch}
                            style={
                              {
                                '--swatch-bg': appearance.background,
                                '--swatch-text': appearance.text,
                              } as CSSProperties
                            }
                          />
                          {plate.weight}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </CollapsibleSection>
    </div>
  );
}

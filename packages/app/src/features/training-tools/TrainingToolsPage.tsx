import { useState } from 'react';
import type { LiftType, SplitRows } from '@dyel/api';
import { PlateCalculator, RepCalculator } from '../calculator';
import { ExerciseAlternativesPage } from '../exercise-alternatives';
import styles from './TrainingToolsPage.module.css';

type Tool = 'plate' | 'alternatives' | 'rep';
const TOOLS: ReadonlyArray<[Tool, string]> = [
  ['plate', 'Plate calculator'],
  ['alternatives', 'Exercise alternatives'],
  ['rep', 'Rep & e1RM calculator'],
];
const EMPTY_SPLIT: SplitRows = { all: [], maxEffort: [], volume: [] };
const EMPTY_ROWS: Record<LiftType, SplitRows> = {
  squat: EMPTY_SPLIT,
  bench: EMPTY_SPLIT,
  deadlift: EMPTY_SPLIT,
  accessory: EMPTY_SPLIT,
};

export function TrainingToolsPage({
  tabRows,
  baselineNames,
  connected = false,
}: {
  tabRows?: Record<LiftType, SplitRows>;
  baselineNames?: Partial<Record<LiftType, string>>;
  connected?: boolean;
}) {
  const [activeTool, setActiveTool] = useState<Tool>(() => {
    const requested = new URLSearchParams(window.location.search).get('tool');
    return requested === 'alternatives' || requested === 'rep' ? requested : 'plate';
  });
  return (
    <main className={styles.page}>
      <nav className={styles.toolGrid} aria-label="Training tool shortcuts">
        {TOOLS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={styles.toolCard}
            aria-pressed={activeTool === id}
            onClick={() => setActiveTool(id)}
          >
            <strong>{label}</strong>
          </button>
        ))}
      </nav>

      {activeTool === 'plate' && (
        <section className={styles.workspace} aria-label="Plate calculator">
          <PlateCalculator
            defaultExpanded
            persistenceId="training-tools:switcher:plate"
            collapsible={false}
          />
        </section>
      )}
      {activeTool === 'alternatives' && (
        <div className={styles.workspace}>
          <ExerciseAlternativesPage embedded />
        </div>
      )}
      {activeTool === 'rep' && (
        <section className={styles.workspace} aria-label="Rep and e1RM calculator">
          <RepCalculator
            tabRows={tabRows ?? EMPTY_ROWS}
            baselineNames={baselineNames ?? {}}
            mode={connected ? 'connected' : 'manual'}
            defaultExpanded
            persistenceId="training-tools:switcher:rep"
            collapsible={false}
          />
        </section>
      )}
    </main>
  );
}

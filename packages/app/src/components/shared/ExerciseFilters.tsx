import { memo, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { FilterState } from '@dyel/core';
import type { ConjugateDataPair } from '../../hooks/conjugate/useConjugateData';
import styles from './ExerciseFilters.module.css';

type SetFacet = keyof FilterState;

const FACET_LABELS: Record<SetFacet, string> = {
  bar: 'Bar',
  stance: 'Stance',
  addlWts: 'Additional Weight',
  equipment: 'Equipment',
};

const FilterButton = memo(function FilterButton({
  value,
  active,
  onClick,
}: {
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(styles.filterButton, active && styles.filterButtonActive)}
    >
      {value}
    </button>
  );
});

export function ExerciseFilters({
  rows,
  filters,
  onToggle,
  onClearAll,
}: {
  rows: ConjugateDataPair[];
  filters: FilterState;
  onToggle: (facet: SetFacet, value: string) => void;
  onClearAll?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const available = useMemo<Record<SetFacet, Set<string>>>(() => {
    const result: Record<SetFacet, Set<string>> = {
      bar: new Set(),
      stance: new Set(),
      addlWts: new Set(),
      equipment: new Set(),
    };
    for (const [ex] of rows) {
      if (ex.bar) {
        result.bar.add(ex.bar);
      }
      if (ex.stance) {
        result.stance.add(ex.stance);
      }
      for (const w of ex.addlWts) {
        result.addlWts.add(w);
      }
      if (ex.equipment) {
        result.equipment.add(ex.equipment);
      }
    }
    return result;
  }, [rows]);

  const activeFacets = useMemo(
    () => (Object.keys(available) as SetFacet[]).filter((k) => available[k].size > 0),
    [available]
  );

  if (activeFacets.length === 0) {
    return null;
  }

  const activeCount = (Object.keys(FACET_LABELS) as SetFacet[]).reduce(
    (n, k) => n + filters[k].size,
    0
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={clsx(styles.toggleButton, open && styles.toggleButtonOpen)}
        >
          {open ? '▲' : '▼'} Filters{activeCount > 0 ? ` (${activeCount} active)` : ''}
        </button>
        {open && activeCount > 0 && onClearAll && (
          <button onClick={onClearAll} className={styles.clearButton}>
            Clear all
          </button>
        )}
      </div>
      {open &&
        activeFacets.map((facet) => (
          <div key={facet} className={styles.facetRow}>
            <span className={styles.facetLabel}>{FACET_LABELS[facet]}:</span>
            {[...available[facet]].sort().map((value) => (
              <FilterButton
                key={value}
                value={value}
                active={filters[facet].has(value)}
                onClick={() => onToggle(facet, value)}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

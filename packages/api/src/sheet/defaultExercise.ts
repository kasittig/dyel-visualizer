import type { TaggedSetRecord } from '@dyel/pipeline';
import { facetsFromTags } from '../conjugate/facets';
import { liftTypeOf } from './parseSheetData';

export function defaultCompExerciseCanonical(
  records: TaggedSetRecord[],
  deadliftStance = 'sumo'
): string | null {
  if (records.length === 0) {
    return null;
  }
  const fallback = records[0].canonical;

  const allComp = records.filter((rec) => {
    if (rec.tags.has('comp-lift')) {
      return true;
    }
    const f = facetsFromTags(rec.tags);
    return (
      (f.bar ?? 'standard') === 'standard' &&
      (f.stance ?? 'competition') === 'competition' &&
      f.addlWts.length === 0
    );
  });

  if (allComp.length > 0) {
    const cmdBench = allComp.find(
      (rec) => facetsFromTags(rec.tags).equipment === 'pause' && liftTypeOf(rec) === 'bench'
    );
    if (cmdBench) {
      return cmdBench.canonical;
    }

    const comp = allComp.find((rec) => facetsFromTags(rec.tags).equipment === null);
    if (comp) {
      return comp.canonical;
    }
  }

  if (records.some((rec) => liftTypeOf(rec) === 'deadlift')) {
    const matchDl = records.find((rec) => {
      if (liftTypeOf(rec) !== 'deadlift') {
        return false;
      }
      const f = facetsFromTags(rec.tags);
      return (
        (f.bar ?? 'standard') === 'standard' &&
        (f.stance ?? 'competition') === deadliftStance &&
        f.addlWts.length === 0
      );
    });
    if (matchDl) {
      return matchDl.canonical;
    }
  }

  return fallback;
}

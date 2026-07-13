import type { TaggedSetRecord } from '@dyel/pipeline';
import { facetsFromTags } from '../conjugate/facets';
import { liftTypeOf } from './parseSheetData';

export function defaultCompExerciseCanonical(
  records: TaggedSetRecord[],
  deadliftStance = 'sumo'
): string | null {
  if (!records.length) {
    return null;
  }

  const allComp = records.filter(
    (r) =>
      r.tags.has('comp-lift') ||
      ((f) =>
        (f.bar ?? 'standard') === 'standard' &&
        (f.stance ?? 'competition') === 'competition' &&
        !f.addlWts.length)(facetsFromTags(r.tags))
  );

  if (allComp.length) {
    const cmdBench = allComp.find(
      (r) => facetsFromTags(r.tags).equipment === 'pause' && liftTypeOf(r) === 'bench'
    );
    if (cmdBench) {
      return cmdBench.canonical;
    }
    const comp = allComp.find((r) => facetsFromTags(r.tags).equipment === null);
    if (comp) {
      return comp.canonical;
    }
  }

  if (records.some((r) => liftTypeOf(r) === 'deadlift')) {
    const matchDl = records.find(
      (r) =>
        liftTypeOf(r) === 'deadlift' &&
        ((f) =>
          (f.bar ?? 'standard') === 'standard' &&
          (f.stance ?? 'competition') === deadliftStance &&
          !f.addlWts.length)(facetsFromTags(r.tags))
    );
    if (matchDl) {
      return matchDl.canonical;
    }
  }

  return records[0].canonical;
}

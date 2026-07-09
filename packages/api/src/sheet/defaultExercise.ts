import type { TaggedSetRecord } from '@dyel/pipeline';
import { facetsFromTags } from '@dyel/pipeline';
import { liftTypeOf } from './parseSheetData';

/**
 * Resolves the default competition exercise canonical for a lift type.
 *
 * Porting logic from @dyel/core's defaultCompExerciseName, but returning
 * the canonical string id instead of a display name, and operating on
 * TaggedSetRecord[] with facets extracted from tags.
 *
 * Selection order (first match wins):
 * 1. If no rows, return null
 * 2. Return first row's canonical as fallback if no better match
 * 3. Filter to "all competition": comp-lift tag OR (bar === 'standard' && stance === 'competition' && no addlWts)
 * 4. If no competition rows, return fallback
 * 5. Among competition rows, prefer: paused bench (equipment === 'pause' && type === 'bench')
 * 6. Then: plain competition (equipment === null)
 * 7. For deadlift-only, consider stance-matching deadlifts
 * 8. Return fallback if no clean competition variant found
 *
 * This logic deliberately matches @dyel/core's behavior 1:1, including the quirk where
 * both baselineName and targetName use the same function (not a deliberate design,
 * but preserved for compatibility).
 */
export function defaultCompExerciseCanonical(
  records: TaggedSetRecord[],
  deadliftStance: string = 'sumo'
): string | null {
  if (records.length === 0) {
    return null;
  }

  // Fallback: first row's canonical
  const fallback = records[0].canonical;

  // Filter to "all competition": standard bar, competition stance, no addlWts
  // (equipment can vary — we filter by equipment separately below)
  const allCompetition = records.filter((rec) => {
    // comp-lift tag means: standard bar, competition stance, no equipment, no addlWts
    if (rec.tags.has('comp-lift')) {
      return true;
    }

    // Otherwise, check explicit facets. Null means "use default".
    const facets = facetsFromTags(rec.tags);
    const bar = facets.bar ?? 'standard'; // null bar defaults to standard
    const stance = facets.stance ?? 'competition'; // null stance defaults to competition
    return bar === 'standard' && stance === 'competition' && facets.addlWts.length === 0;
  });

  if (allCompetition.length > 0) {
    // Prefer paused bench (for commands/tempo work)
    const commandsBench = allCompetition.filter((rec) => {
      const facets = facetsFromTags(rec.tags);
      return facets.equipment === 'pause' && liftTypeOf(rec) === 'bench';
    });

    if (commandsBench.length > 0) {
      return commandsBench[0].canonical;
    }

    // Prefer competition with no equipment
    const competition = allCompetition.filter((rec) => {
      const facets = facetsFromTags(rec.tags);
      return facets.equipment === null;
    });

    if (competition.length > 0) {
      return competition[0].canonical;
    }
  }

  // For deadlifts: if we have no clean competition, check for stance-matching deadlifts
  // (because deadlifts don't have a fixed "competition" stance — it depends on the user's preference)
  if (records.some((rec) => liftTypeOf(rec) === 'deadlift')) {
    const allCompetitionDl = records.filter((rec) => {
      if (liftTypeOf(rec) !== 'deadlift') {
        return false;
      }
      const facets = facetsFromTags(rec.tags);
      const bar = facets.bar ?? 'standard'; // null bar defaults to standard
      const stance = facets.stance ?? 'competition'; // null stance defaults to competition (but we'll override below)
      // Match: bar is standard AND stance matches user preference AND no addlWts
      return bar === 'standard' && stance === deadliftStance && facets.addlWts.length === 0;
    });

    if (allCompetitionDl.length > 0) {
      return allCompetitionDl[0].canonical;
    }
  }

  // Final fallback
  return fallback;
}

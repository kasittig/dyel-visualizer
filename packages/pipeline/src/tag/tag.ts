import type { SetRecord, TagQuery } from '../types';
import { parseExercise } from './detect/parseExercise';
import { buildCanonical, buildTagsAndEffects } from './detect/canonical';
import type { BaselineRange } from './detect/canonical';
import type {
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
  ParsedExercise,
} from './detect/conjugate-types';

export type TaggedSetRecord = SetRecord & {
  canonical: string;
  tags: ReadonlySet<string>;
  effects: readonly string[];
  baselineRange: BaselineRange | null;
};

function isUnknown(ex: ParsedExercise): boolean {
  return (
    ex.type === 'accessory' &&
    ex.bar === null &&
    ex.stance === null &&
    ex.equipment === null &&
    ex.addlWts.length === 0
  );
}

export function resolveCanonicalNames(records: SetRecord[]) {
  const unknown = new Set<string>();

  const resolved = records.reduce<SetRecord[]>((acc, r) => {
    const ex = parseExercise(r.exercise);
    if (isUnknown(ex)) {
      unknown.add(r.exercise);
      return acc;
    }
    acc.push({
      ...r,
      exercise: buildCanonical(ex, r.exercise),
      meta: { ...r.meta, rawExercise: r.exercise },
    });
    return acc;
  }, []);

  return { resolved, unknown: [...unknown] };
}

export function tagRecords(records: SetRecord[], deadliftStance: 'sumo' | 'conventional' = 'sumo') {
  const unknown = new Set<string>();
  const tagged = records.flatMap((r) => {
    // Re-parse the ORIGINAL raw name (preserved by resolveCanonicalNames), never the
    // canonical slug — a slug like "bench-close" doesn't reliably re-parse through the
    // same keyword detectors as its source text "Bench (CG)" and can silently lose
    // modifiers (see issue: close-grip bench was mis-tagged comp-lift this way).
    const rawExercise = r.meta?.rawExercise ?? r.exercise;
    const ex = parseExercise(rawExercise);
    if (isUnknown(ex)) {
      unknown.add(rawExercise);
      return [];
    }
    const { tags, effects, range } = buildTagsAndEffects(ex, deadliftStance);
    return [{ ...r, canonical: r.exercise, tags, effects, baselineRange: range }];
  });

  return { tagged, unknown: [...unknown] };
}

export function matches(tags: ReadonlySet<string>, q: TagQuery): boolean {
  if (q.all && !q.all.every((t) => tags.has(t))) {
    return false;
  }
  if (q.any && !q.any.some((t) => tags.has(t))) {
    return false;
  }
  if (q.none && q.none.some((t) => tags.has(t))) {
    return false;
  }
  return true;
}

// Slug-to-type mapping for additional weight modifiers
// Mirrors the ADDL_WT_SLUGS from canonical.ts; reverses it for tag parsing
const SLUG_TO_ADDL_WT: Record<string, ConjugateAddlWt> = {
  chains: 'chains',
  bands: 'bands',
  'rev-bands': 'rev. bands',
};

/**
 * Parses tag strings back into structured conjugate-lift facets.
 * Tags follow the format: `bar:${value}`, `stance:${value}`, `equip:${value}`, `addl:${slug}:${magnitude}`.
 * A record with all-default facets gets tag `comp-lift` (no bar/stance/equip/addl tags).
 *
 * Equipment magnitude (e.g., board/block/deficit count) is parsed from tags like `equip:board-2`.
 * When both bare (`equip:board`) and magnitude-bearing (`equip:board-2`) tags are present
 * (as they are when magnitude is non-default), the magnitude from the magnitude-bearing tag
 * is preserved regardless of iteration order.
 */
export function facetsFromTags(tags: ReadonlySet<string>): {
  bar: ConjugateBar | null;
  stance: ConjugateStance | null;
  equipment: ConjugateEquipment | null;
  equipmentMagnitude: string | null;
  addlWts: ConjugateAddlWt[];
} {
  let bar: ConjugateBar | null = null;
  let stance: ConjugateStance | null = null;
  let equipment: ConjugateEquipment | null = null;
  let equipmentMagnitude: string | null = null;
  const addlWts: ConjugateAddlWt[] = [];

  for (const tag of tags) {
    if (tag.startsWith('bar:')) {
      const value = tag.slice(4);
      bar = value.split('-')[0] as ConjugateBar;
    } else if (tag.startsWith('stance:')) {
      const value = tag.slice(7);
      stance = value.split('-')[0] as ConjugateStance;
    } else if (tag.startsWith('equip:')) {
      const value = tag.slice(6);
      const parts = value.split('-');
      equipment = parts[0] as ConjugateEquipment;
      // If the tag includes a magnitude suffix (e.g., 'board-2' from 'equip:board-2'),
      // capture it. Only set equipmentMagnitude when a magnitude is actually present,
      // so the magnitude-bearing tag's value wins even if the bare tag is processed later.
      if (parts.length > 1) {
        equipmentMagnitude = parts[1];
      }
    } else if (tag.startsWith('addl:')) {
      const parts = tag.slice(5).split(':');
      if (parts.length >= 1) {
        const slug = parts[0];
        const addlWtType = SLUG_TO_ADDL_WT[slug];
        if (addlWtType) {
          addlWts.push(addlWtType);
        }
      }
    }
  }

  return { bar, stance, equipment, equipmentMagnitude, addlWts };
}

/**
 * Derives a family key from a canonical exercise string.
 * Strips trailing addl-wt segments and their magnitude suffixes to isolate
 * the type/bar/stance/equipment identity used for matching variants that
 * differ only by additional-weight loading.
 *
 * Examples:
 * - "bench" → "bench"
 * - "bench-close" → "bench-close"
 * - "bench-close-chains" → "bench-close"
 * - "bench-close-chains-2" → "bench-close"
 * - "bench-board-2" → "bench-board-2" (equipment magnitude is preserved)
 */
export function facetFamilyKey(canonical: string): string {
  const addlWtSlugs = ['chains', 'rev-bands', 'bands'];
  const parts = canonical.split('-');

  // Greedily remove trailing parts that are addl-wt slugs or their magnitude suffixes.
  // A number following an addl-wt slug is addl-wt magnitude; stop at a number
  // that doesn't follow an addl-wt slug (that's equipment magnitude).
  while (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      // Last part is a number; check if previous part is an addl-wt slug
      const secondLast = parts[parts.length - 2];
      if (addlWtSlugs.includes(secondLast)) {
        // It's addl-wt magnitude, remove both the slug and magnitude
        parts.pop();
        parts.pop();
      } else {
        // It's equipment magnitude, stop here
        break;
      }
    } else if (addlWtSlugs.includes(lastPart)) {
      // Last part is addl-wt slug with implicit magnitude (chains defaults to 1)
      parts.pop();
    } else {
      // It's something else (bar/stance/equipment), stop
      break;
    }
  }

  return parts.join('-');
}

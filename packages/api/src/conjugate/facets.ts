import type {
  ConjugateBar,
  ConjugateStance,
  ConjugateEquipment,
  ConjugateAddlWt,
  TaggedSetRecord,
} from '@dyel/pipeline';

export const CONJUGATE_BARS = [
  'ssb',
  'american',
  'swiss',
  'cambered',
  'standard',
  'trap',
  'zercher',
  'duffalo',
  'dumbbell',
  'bamboo',
  'belt',
  'goblet',
] as const satisfies readonly ConjugateBar[];
export const CONJUGATE_STANCES = [
  'close',
  'narrow',
  'sumo',
  'conventional',
  'front',
  'medium',
  'wide',
  'romanian',
  'slingshot',
  'builder',
  'lowbar',
] as const satisfies readonly ConjugateStance[];
export const CONJUGATE_EQUIPMENT = [
  'incline',
  'decline',
  'blocks',
  'deficit',
  'board',
  'pause',
  'floor',
  'box',
  'rack',
] as const satisfies readonly ConjugateEquipment[];
export const CONJUGATE_ADDL_WTS = [
  'bands',
  'rev. bands',
  'chains',
] as const satisfies readonly ConjugateAddlWt[];

const SLUG_TO_ADDL_WT: Record<string, ConjugateAddlWt> = {
  chains: 'chains',
  bands: 'bands',
  'rev-bands': 'rev. bands',
};

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
      bar = tag.slice(4).split('-')[0] as ConjugateBar;
    } else if (tag.startsWith('stance:')) {
      stance = tag.slice(7).split('-')[0] as ConjugateStance;
    } else if (tag.startsWith('equip:')) {
      const [type, mag] = tag.slice(6).split('-');
      equipment = type as ConjugateEquipment;
      if (mag) {
        equipmentMagnitude = mag;
      }
    } else if (tag.startsWith('addl:')) {
      const type = SLUG_TO_ADDL_WT[tag.slice(5).split(':')[0]];
      if (type) {
        addlWts.push(type);
      }
    }
  }
  return { bar, stance, equipment, equipmentMagnitude, addlWts };
}

export function facetFamilyKey(canonical: string): string {
  const addlSlugs = ['chains', 'rev-bands', 'bands'];
  const parts = canonical.split('-');

  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    const prev = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    if (/^\d+$/.test(last) && prev !== undefined && addlSlugs.includes(prev)) {
      // Check if this is rev-bands with magnitude
      if (parts.length >= 3 && prev === 'bands' && parts[parts.length - 3] === 'rev') {
        parts.splice(-3); // Remove rev + bands + magnitude
      } else {
        parts.splice(-2); // Remove addlSlug + magnitude
      }
    } else if (last === 'bands' && prev === 'rev') {
      parts.splice(-2);
    } else if (addlSlugs.includes(last)) {
      parts.pop();
    } else {
      break;
    }
  }
  return parts.join('-');
}

export interface FacetSelection {
  bar?: ConjugateBar | null;
  stance?: ConjugateStance | null;
  equipment?: ConjugateEquipment | null;
  addlWt?: ConjugateAddlWt | null;
}

export function canonicalsMatchingFacets(
  records: TaggedSetRecord[],
  selection: FacetSelection
): Set<string> {
  const matched = new Set<string>();
  for (const r of records) {
    if (matched.has(r.canonical)) {
      continue;
    }
    const f = facetsFromTags(r.tags);
    if (selection.bar && f.bar !== selection.bar) {
      continue;
    }
    if (selection.stance && f.stance !== selection.stance) {
      continue;
    }
    if (selection.equipment && f.equipment !== selection.equipment) {
      continue;
    }
    if (selection.addlWt && !f.addlWts.includes(selection.addlWt)) {
      continue;
    }
    matched.add(r.canonical);
  }
  return matched;
}

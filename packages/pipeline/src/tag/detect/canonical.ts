import type { ConjugateAddlWt, ParsedExercise } from './conjugate-types';
import modifierEffects from './modifier-effects.json';

const ADDL_WT_SLUGS: Record<ConjugateAddlWt, string> = {
  chains: 'chains',
  bands: 'bands',
  'rev. bands': 'rev-bands',
};

// Manual single-pass scan (no regex) so slugify runs in guaranteed linear time
// regardless of input shape - avoids CodeQL's polynomial-redos concern for a
// chained-quantifier regex approach on library/uncontrolled exercise-name input.
function slugify(value: string): string {
  let slug = '';
  let pendingDash = false;
  for (const ch of value.toLowerCase()) {
    const isAlphanumeric = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    if (!isAlphanumeric) {
      pendingDash = true;
      continue;
    }
    if (pendingDash && slug) {
      slug += '-';
    }
    pendingDash = false;
    slug += ch;
  }
  return slug;
}

export function buildCanonical(ex: ParsedExercise, rawName: string): string {
  if (ex.type === 'accessory') {
    return slugify(rawName);
  }

  const parts: string[] = [ex.type];
  if (ex.bar && ex.bar !== 'standard') {
    parts.push(ex.bar);
  }
  if (ex.stance && ex.stance !== 'competition') {
    parts.push(ex.stance);
  }
  if (ex.equipment) {
    parts.push(ex.equipment);
  }
  parts.push(
    ...ex.addlWts.map(
      (w) =>
        `${ADDL_WT_SLUGS[w.kind]}${w.kind === 'chains' && w.magnitude === '1' ? '' : `-${w.magnitude}`}`
    )
  );
  return parts.join('-');
}

interface ModifierEffectEntry {
  effects: string[];
}

const effectsMap = modifierEffects as Record<string, ModifierEffectEntry>;

export function buildTagsAndEffects(ex: ParsedExercise): { tags: Set<string>; effects: string[] } {
  const tags = new Set<string>([`lift:${ex.type}`]);
  const effects = new Set<string>();

  if (ex.type === 'accessory') {
    return { tags, effects: [] };
  }

  const hasBar = ex.bar !== null && ex.bar !== 'standard';
  const hasStance = ex.stance !== null && ex.stance !== 'competition';
  const hasEquipment = ex.equipment !== null;
  const hasAddlWts = ex.addlWts.length > 0;

  if (!hasBar && !hasStance && !hasEquipment && !hasAddlWts) {
    tags.add('comp-lift');
    return { tags, effects: [] };
  }

  if (hasBar) {
    tags.add(`bar:${ex.bar}`);
    effectsMap[`bar:${ex.bar}:${ex.type}`]?.effects.forEach((e) => effects.add(e));
  }
  if (hasStance) {
    tags.add(`stance:${ex.stance}`);
    effectsMap[`stance:${ex.stance}:${ex.type}`]?.effects.forEach((e) => effects.add(e));
  }
  if (hasEquipment) {
    tags.add(`equip:${ex.equipment}`);
    effectsMap[`equip:${ex.equipment}:${ex.type}`]?.effects.forEach((e) => effects.add(e));
  }
  for (const w of ex.addlWts) {
    const slug = ADDL_WT_SLUGS[w.kind];
    tags.add(`addl:${slug}:${w.magnitude}`);
    (
      effectsMap[`addl:${slug}:${w.magnitude}:${ex.type}`] ?? effectsMap[`addl:${slug}:${ex.type}`]
    )?.effects.forEach((e) => effects.add(e));
  }

  return { tags, effects: [...effects] };
}

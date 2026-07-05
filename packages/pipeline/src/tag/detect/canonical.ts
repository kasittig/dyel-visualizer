import type { ConjugateAddlWt, ParsedExercise } from './conjugate-types';
import modifierEffects from './modifier-effects.json';

const ADDL_WT_SLUGS: Record<ConjugateAddlWt, string> = {
  chains: 'chains',
  bands: 'bands',
  'rev. bands': 'rev-bands',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  parts.push(...ex.addlWts.map((w) => ADDL_WT_SLUGS[w]));
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
    const slug = ADDL_WT_SLUGS[w];
    tags.add(`addl:${slug}`);
    effectsMap[`addl:${slug}:${ex.type}`]?.effects.forEach((e) => effects.add(e));
  }

  return { tags, effects: [...effects] };
}

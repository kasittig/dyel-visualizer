import type { ConjugateAddlWt, ParsedExercise } from './conjugate-types';
import modifierEffects from './modifier-effects.json';

const ADDL_WT_SLUGS: Record<ConjugateAddlWt, string> = {
  chains: 'chains',
  bands: 'bands',
  'rev. bands': 'rev-bands',
};
const effectsMap = modifierEffects as Record<string, { effects: string[] }>;

function slugify(value: string): string {
  let slug = '',
    pendingDash = false;
  for (const ch of value.toLowerCase()) {
    const isNumOrAlpha = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    if (!isNumOrAlpha) {
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
    parts.push(
      ex.equipmentMagnitude && ex.equipmentMagnitude !== '1'
        ? `${ex.equipment}-${ex.equipmentMagnitude}`
        : ex.equipment
    );
  }
  parts.push(
    ...ex.addlWts.map((w) => {
      return `${ADDL_WT_SLUGS[w.kind]}${w.kind === 'chains' && w.magnitude === '1' ? '' : `-${w.magnitude}`}`;
    })
  );
  return parts.join('-');
}

export function buildTagsAndEffects(ex: ParsedExercise): { tags: Set<string>; effects: string[] } {
  const tags = new Set<string>([`lift:${ex.type}`]),
    effects = new Set<string>();
  if (ex.type === 'accessory') {
    return { tags, effects: [] };
  }

  const hasBar = ex.bar && ex.bar !== 'standard',
    hasStance = ex.stance && ex.stance !== 'competition';
  if (!hasBar && !hasStance && !ex.equipment && !ex.addlWts.length) {
    tags.add('comp-lift');
    return { tags, effects: [] };
  }

  const add = (k: string) => {
    return effectsMap[k]?.effects.forEach((e) => {
      return effects.add(e);
    });
  };
  if (hasBar) {
    tags.add(`bar:${ex.bar}`);
    add(`bar:${ex.bar}:${ex.type}`);
  }
  if (hasStance) {
    tags.add(`stance:${ex.stance}`);
    add(`stance:${ex.stance}:${ex.type}`);
  }
  if (ex.equipment) {
    tags.add(`equip:${ex.equipment}`);
    add(`equip:${ex.equipment}:${ex.type}`);
  }

  for (const w of ex.addlWts) {
    const slug = ADDL_WT_SLUGS[w.kind];
    tags.add(`addl:${slug}:${w.magnitude}`);
    (
      effectsMap[`addl:${slug}:${w.magnitude}:${ex.type}`] ?? effectsMap[`addl:${slug}:${ex.type}`]
    )?.effects.forEach((e) => {
      return effects.add(e);
    });
  }
  return { tags, effects: [...effects] };
}

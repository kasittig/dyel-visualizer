import type { ConjugateAddlWt, ConjugateStance, ParsedExercise } from './conjugate-types';
import { classifyAccessoryEffects } from './detectors';
import modifierEffects from './modifier-effects.json';
import { parseExercise } from './parseExercise';

const ADDL_WT_SLUGS: Record<ConjugateAddlWt, string> = {
  chains: 'chains',
  bands: 'bands',
  'rev. bands': 'rev-bands',
};

export function resolveDeadliftStance(
  stance: ConjugateStance | null,
  preference: 'sumo' | 'conventional'
): 'sumo' | 'conventional' {
  if (stance === 'sumo' || stance === 'conventional') {
    return stance;
  }
  if (stance === 'opposite') {
    return preference === 'sumo' ? 'conventional' : 'sumo';
  }
  return preference;
}

const effectsMap = modifierEffects as Record<
  string,
  { effects: string[]; min?: number; max?: number }
>;

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

export interface BaselineRange {
  min: number;
  max: number;
}

export function buildTagsAndEffects(
  rawName: string,
  deadliftStance: 'sumo' | 'conventional' = 'sumo'
): { tags: Set<string>; effects: string[]; range: BaselineRange | null } {
  const ex = parseExercise(rawName);
  const tags = new Set<string>([`lift:${ex.type}`]),
    effects = new Set<string>();
  if (ex.type === 'accessory') {
    return { tags, effects: classifyAccessoryEffects(rawName), range: null };
  }

  const hasBar = ex.bar && ex.bar !== 'standard',
    hasStance = ex.stance && ex.stance !== 'competition';
  const isBareVariant = !hasBar && !hasStance && !ex.equipment && !ex.addlWts.length;
  if (isBareVariant) {
    tags.add('comp-lift');
    tags.add('bar:standard');
    tags.add('stance:competition');
  }
  if (isBareVariant && ex.type !== 'deadlift') {
    return { tags, effects: [], range: null };
  }

  const add = (k: string) => {
    return effectsMap[k]?.effects.forEach((e: string) => {
      return effects.add(e);
    });
  };
  let range: BaselineRange | null = null;

  const applyRange = (k: string) => {
    const entry = effectsMap[k];
    if (entry?.min === undefined || entry.max === undefined) {
      return;
    }
    const cur = range ?? { min: 100, max: 100 };
    range = {
      min: Math.round((cur.min * entry.min) / 100),
      max: Math.round((cur.max * entry.max) / 100),
    };
  };

  if (ex.equipment) {
    tags.add(`equip:${ex.equipment}`);
    if (ex.equipmentMagnitude && ex.equipmentMagnitude !== '1') {
      tags.add(`equip:${ex.equipment}-${ex.equipmentMagnitude}`);
    }
    const magKey =
      ex.equipmentMagnitude && ex.equipmentMagnitude !== '1'
        ? `equip:${ex.equipment}-${ex.equipmentMagnitude}:${ex.type}`
        : null;
    const baseKey = `equip:${ex.equipment}:${ex.type}`;
    const targetKey = magKey && effectsMap[magKey] ? magKey : baseKey;
    add(targetKey);
    applyRange(targetKey);
  }

  const isDeadliftExplicitStance =
    ex.type === 'deadlift' &&
    (ex.stance === 'sumo' || ex.stance === 'conventional' || ex.stance === 'opposite');
  if (isDeadliftExplicitStance) {
    const resolvedStance = resolveDeadliftStance(ex.stance, deadliftStance);
    add(`stance:${resolvedStance}:deadlift`);
    applyRange(`stance:${resolvedStance}:deadlift`);
    if (hasStance) {
      tags.add(`stance:${ex.stance}`);
    }
  } else if (hasStance) {
    tags.add(`stance:${ex.stance}`);
    add(`stance:${ex.stance}:${ex.type}`);
    applyRange(`stance:${ex.stance}:${ex.type}`);
  }

  if (hasBar) {
    tags.add(`bar:${ex.bar}`);
    add(`bar:${ex.bar}:${ex.type}`);
    applyRange(`bar:${ex.bar}:${ex.type}`);
  }

  for (const w of ex.addlWts) {
    const slug = ADDL_WT_SLUGS[w.kind];
    tags.add(`addl:${slug}:${w.magnitude}`);
    (
      effectsMap[`addl:${slug}:${w.magnitude}:${ex.type}`] ?? effectsMap[`addl:${slug}:${ex.type}`]
    )?.effects.forEach((e: string) => {
      return effects.add(e);
    });
  }

  if (range === null && ex.addlWts.length > 0) {
    range = { min: 100, max: 100 };
  }
  return { tags, effects: [...effects], range };
}

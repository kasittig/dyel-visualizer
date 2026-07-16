import type { ConjugateAddlWt, ParsedExercise } from './conjugate-types';
import { DEFAULT_STANCE } from './conjugate-types';
import { classifyAccessoryEffects } from './detectors';
import modifierEffects from './modifier-effects.json';
import { parseExercise } from './parseExercise';

const ADDL_WT_SLUGS: Record<ConjugateAddlWt, string> = {
  chains: 'chains',
  bands: 'bands',
  'rev. bands': 'rev-bands',
};

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
  if (ex.stance && ex.stance !== DEFAULT_STANCE[ex.type]) {
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

export function buildTagsAndEffects(rawName: string): {
  tags: Set<string>;
  effects: string[];
  range: BaselineRange | null;
} {
  const ex = parseExercise(rawName);
  const tags = new Set<string>([`lift:${ex.type}`]),
    effects = new Set<string>();
  if (ex.type === 'accessory') {
    return { tags, effects: classifyAccessoryEffects(rawName), range: null };
  }

  const defaultStance = DEFAULT_STANCE[ex.type];
  const hasBar = ex.bar && ex.bar !== 'standard',
    hasExplicitStance = ex.stance && ex.stance !== defaultStance;
  const isBareVariant = !hasBar && !hasExplicitStance && !ex.equipment && !ex.addlWts.length;
  if (isBareVariant) {
    tags.add('comp-lift');
    tags.add('bar:standard');
    tags.add(`stance:${defaultStance}`);
  }

  const add = (k: string) => {
    return effectsMap[k]?.effects.forEach((e: string) => {
      return effects.add(e);
    });
  };
  let range: BaselineRange | null = null;
  let equipmentRangeMissing = false;

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

  // Hoist resolvedStance computation for deadlifts (needed for stance-qualified equipment lookup).
  // Bare deadlift now defaults to 'conventional' via DEFAULT_STANCE, so this matches every
  // deadlift record, not just explicitly-typed sumo/conventional ones.
  let resolvedStance: 'sumo' | 'conventional' | null = null;
  const isDeadliftSumoOrConventional =
    ex.type === 'deadlift' && (ex.stance === 'sumo' || ex.stance === 'conventional');
  if (isDeadliftSumoOrConventional) {
    resolvedStance = ex.stance as 'sumo' | 'conventional';
  }

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

    let targetKey = baseKey;

    // Try stance-qualified key first if deadlift with explicit stance
    if (ex.type === 'deadlift' && resolvedStance) {
      const stanceQualifiedMagKey =
        ex.equipmentMagnitude && ex.equipmentMagnitude !== '1'
          ? `equip:${ex.equipment}-${ex.equipmentMagnitude}:${resolvedStance}:deadlift`
          : `equip:${ex.equipment}:${resolvedStance}:deadlift`;
      if (effectsMap[stanceQualifiedMagKey]) {
        targetKey = stanceQualifiedMagKey;
      } else if (magKey && effectsMap[magKey]) {
        // Fall back to magnitude key
        targetKey = magKey;
      } else if (!effectsMap[baseKey]) {
        // No stance-qualified, magnitude, or base entry exists for this equipment/magnitude/stance
        // combination — this is a known data gap, not a fallback opportunity. Composing only the
        // stance range here would produce a misleading partial result, so the whole range must
        // resolve unassessed rather than silently averaging in just the stance component.
        equipmentRangeMissing = true;
      }
      // If neither stance-qualified nor magnitude key exists, use baseKey
    } else {
      // Non-deadlift or no explicit stance: use existing logic
      targetKey = magKey && effectsMap[magKey] ? magKey : baseKey;
    }

    add(targetKey);
    applyRange(targetKey);
  }

  if (isDeadliftSumoOrConventional) {
    add(`stance:${resolvedStance}:deadlift`);
    applyRange(`stance:${resolvedStance}:deadlift`);
    if (hasExplicitStance) {
      tags.add(`stance:${ex.stance}`);
    }
  } else if (ex.stance) {
    if (hasExplicitStance) {
      tags.add(`stance:${ex.stance}`);
    }
    add(`stance:${ex.stance}:${ex.type}`);
    applyRange(`stance:${ex.stance}:${ex.type}`);
  }

  if (ex.type === 'squat' && ex.stance === 'lowbar') {
    tags.add('competition');
  } else if (ex.type === 'bench' && ex.stance === 'wide') {
    tags.add('competition');
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
  if (equipmentRangeMissing) {
    range = null;
  }
  return { tags, effects: [...effects], range };
}

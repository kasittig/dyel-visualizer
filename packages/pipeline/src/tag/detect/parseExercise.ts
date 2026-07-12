import type { ParsedAddlWt, ParsedExercise } from './conjugate-types';
import { BAR_DETECTORS, EQUIPMENT_DETECTORS, STANCE_DETECTORS, TYPE_DETECTORS } from './detectors';
import type { Detector } from './detectors';

function makeParser<T>(detectors: Detector<T>): (lower: string, tokens: Set<string>) => T | null {
  return (lower, tokens) => detectors.find(([, detect]) => detect(lower, tokens))?.[0] ?? null;
}

const parseBar = makeParser(BAR_DETECTORS);
const parseStance = makeParser(STANCE_DETECTORS);
const parseEquipment = makeParser(EQUIPMENT_DETECTORS);
const parseLiftType = makeParser(TYPE_DETECTORS);

export function parseExercise(name: string): ParsedExercise {
  const lower = name.toLowerCase().trim();
  const parenIdx = lower.indexOf('(');
  const base = (parenIdx === -1 ? lower : lower.slice(0, parenIdx)).trim();
  const modStr =
    parenIdx === -1
      ? ''
      : lower
          .slice(parenIdx + 1)
          .replace(/\)/g, '')
          .trim();
  const modifiers = modStr ? modStr.split(',').map((m) => m.trim()) : [];

  const tokens = new Set([...base.split(/\s+/), ...modifiers.flatMap((m) => m.split(/\s+/))]);

  const has = (phrase: string) => lower.includes(phrase);
  const hasReverseBands = has('reverse band') || has('rev. band') || has('rev band');
  const addlWts: ParsedAddlWt[] = [];

  // Chains: parse digit or "double" word for magnitude, default to "1".
  // Quantifiers are bounded (rather than +/*) so this can't be flagged as a
  // polynomial-time regex on uncontrolled input - no realistic exercise name
  // has hundreds of digits or whitespace characters before "chains".
  if (has('chain')) {
    const digitMatch = lower.match(/(\d{1,4})\s{0,4}chains?/);
    const doubleMatch = lower.match(/\bdouble\s{1,4}chains?/);
    const magnitude = digitMatch ? digitMatch[1] : doubleMatch ? '2' : '1';
    addlWts.push({ kind: 'chains', magnitude });
  }

  // Regular bands (non-reverse): parse tension descriptor, default to "unspecified"
  if (!hasReverseBands && has('band')) {
    const magnitude =
      ['light', 'mini', 'micro', 'heavy', 'medium'].find((word) => has(word)) ?? 'unspecified';
    addlWts.push({ kind: 'bands', magnitude });
  }

  // Reverse bands: parse tension descriptor, default to "unspecified"
  if (hasReverseBands) {
    const magnitude =
      ['light', 'mini', 'micro', 'heavy', 'medium'].find((word) => has(word)) ?? 'unspecified';
    addlWts.push({ kind: 'rev. bands', magnitude });
  }

  const isDumbbell = lower.includes('dumbbell') || tokens.has('db');
  const type = isDumbbell ? 'accessory' : (parseLiftType(base, tokens) ?? 'accessory');

  if (type === 'accessory') {
    return {
      type,
      bar: null,
      stance: null,
      addlWts: [],
      equipment: null,
      equipmentMagnitude: null,
    };
  }

  const equipment = parseEquipment(lower, tokens);
  let equipmentMagnitude: string | null = null;

  // Equipment magnitude parsing: board, block, deficit (similar to chains/bands pattern)
  // Each follows bounded regex to avoid polynomial-time redos on uncontrolled input.
  if (equipment === 'board') {
    const digitMatch = lower.match(/(\d{1,4})\s{0,4}board/);
    const doubleMatch = lower.match(/\bdouble\s{1,4}board/);
    equipmentMagnitude = digitMatch ? digitMatch[1] : doubleMatch ? '2' : '1';
  } else if (equipment === 'blocks') {
    const digitMatch = lower.match(/(\d{1,4})"{0,1}\s{0,4}blocks?/);
    equipmentMagnitude = digitMatch ? digitMatch[1] : '1';
  } else if (equipment === 'deficit') {
    const digitMatch = lower.match(/(\d{1,4})"{0,1}\s{0,4}deficit/);
    equipmentMagnitude = digitMatch ? digitMatch[1] : '1';
  }

  return {
    type,
    bar: parseBar(lower, tokens) ?? 'standard',
    stance: parseStance(lower, tokens) ?? 'competition',
    addlWts,
    equipment,
    equipmentMagnitude,
  };
}

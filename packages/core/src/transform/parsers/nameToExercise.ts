import { type ConjugateAddlWt, type ConjugateExercise } from '../../types/conjugate';
import { BAR_DETECTORS, EQUIPMENT_DETECTORS, STANCE_DETECTORS, TYPE_DETECTORS } from './detectors';
import type { Detector } from './detectors';

function makeParser<T>(detectors: Detector<T>): (lower: string, tokens: Set<string>) => T | null {
  return (lower, tokens) => detectors.find(([, detect]) => detect(lower, tokens))?.[0] ?? null;
}

const parseBar = makeParser(BAR_DETECTORS);
const parseStance = makeParser(STANCE_DETECTORS);
const parseEquipment = makeParser(EQUIPMENT_DETECTORS);
const parseLiftType = makeParser(TYPE_DETECTORS);

export function nameToExercise(name: string): ConjugateExercise | null {
  const displayName = name;

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

  const has = (phrase: string) => lower.includes(phrase);
  const tokens = new Set([...base.split(/\s+/), ...modifiers.flatMap((m) => m.split(/\s+/))]);

  const hasReverseBands = has('reverse band') || has('rev. band') || has('rev band');
  const hasChains = has('chain');
  const hasBands = !hasReverseBands && has('band');
  const addlWts: ConjugateAddlWt[] = [
    ...(hasChains ? (['chains'] as const) : []),
    ...(hasBands ? (['bands'] as const) : []),
    ...(hasReverseBands ? (['rev. bands'] as const) : []),
  ];

  const isDumbbell = lower.includes('dumbbell') || tokens.has('db');
  const type = isDumbbell ? 'accessory' : (parseLiftType(base, tokens) ?? 'accessory');

  const core =
    type === 'accessory'
      ? { type, bar: null, stance: null, addlWts: [] as ConjugateAddlWt[], equipment: null }
      : {
          type,
          bar: parseBar(lower, tokens) ?? 'standard',
          stance: parseStance(lower, tokens) ?? 'competition',
          addlWts,
          equipment: parseEquipment(lower, tokens),
        };
  return {
    ...core,
    displayName,
    averageIndex: null,
    expectedBaseline: null,
    diagnostic: null,
    status: null,
    effects: [],
  };
}

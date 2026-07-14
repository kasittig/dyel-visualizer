import type {
  ConjugateBar,
  ConjugateEquipment,
  ConjugateStance,
  LiftType,
} from './conjugate-types';

export type Detector<T> = Array<[T, (lower: string, tokens: Set<string>) => boolean]>;

export const BAR_DETECTORS: Detector<ConjugateBar> = [
  ['ssb', (l) => l.includes('ssb') || l.includes('safety')],
  ['trap', (l) => l.includes('trap')],
  ['american', (l) => l.includes('american')],
  ['swiss', (l) => l.includes('swiss')],
  ['cambered', (l) => l.includes('cambered')],
  ['zercher', (l) => l.includes('zercher')],
  ['duffalo', (l) => l.includes('duffalo')],
  ['dumbbell', (l, t) => l.includes('dumbbell') || t.has('db')],
  ['bamboo', (l) => l.includes('bamboo')],
  ['belt', (l) => l.includes('belt')],
  ['goblet', (l) => l.includes('goblet')],
];
export const STANCE_DETECTORS: Detector<ConjugateStance> = [
  ['slingshot', (l) => l.includes('slingshot')],
  ['builder', (l) => l.includes('builder')],
  ['close', (l, t) => l.includes('close grip') || t.has('close') || t.has('cg')],
  ['narrow', (l) => l.includes('narrow')],
  ['wide', (l, t) => l.includes('wide grip') || t.has('wide')],
  ['medium', (l, t) => l.includes('medium grip') || t.has('medium')],
  ['romanian', (l) => l.includes('romanian') || l.includes('rdl')],
  ['sumo', (l) => l.includes('sumo')],
  ['conventional', (l) => l.includes('conventional')],
  ['front', (l) => l.includes('front')],
  ['opposite', (l) => l.includes('opposite')],
  ['competition', (l) => l.includes('competition')],
];
export const EQUIPMENT_DETECTORS: Detector<ConjugateEquipment> = [
  ['incline', (l) => l.includes('incline')],
  ['decline', (l) => l.includes('decline')],
  ['blocks', (l) => l.includes('block')],
  ['deficit', (l) => l.includes('deficit')],
  ['board', (l) => l.includes('board')],
  ['pause', (l) => l.includes('command') || l.includes('pause')],
  ['floor', (l) => l.includes('floor')],
  ['box', (l) => l.includes('box')],
  ['rack', (l) => l.includes('rack')],
];
export const TYPE_DETECTORS: Detector<LiftType> = [
  ['squat', (l) => l.includes('squat') || l.includes('ssb') || l.includes('safety')],
  [
    'bench',
    (l) =>
      l.includes('floor') ||
      l.includes('bench') ||
      l.includes('incline') ||
      l.includes('decline') ||
      l.includes('board') ||
      l.includes('slingshot'),
  ],
  ['deadlift', (l) => l.includes('deadlift') || l.includes('rack') || l.includes('rdl')],
];

export const CORE_PATTERN =
  /\b(abs?|core|plank|crunch(es)?|hollow|sit[\s-]?up|situp|russian twist|leg raise|pallof|wood\s?chop|dead bug|v[\s-]?up)\b/;

export function isCoreExercise(rawName: string): boolean {
  return CORE_PATTERN.test(rawName.toLowerCase());
}

export type AccessoryEffect = 'BACK' | 'SHOULDERS' | 'TRICEPS' | 'POSTERIOR_CHAIN';

export const ACCESSORY_EFFECT_DETECTORS: Detector<AccessoryEffect> = [
  ['BACK', (l) => /\blats?\b/.test(l) || /\brows?\b/.test(l)],
  ['SHOULDERS', (l, t) => t.has('ohp') || l.includes('overhead')],
  ['TRICEPS', (l, t) => /\btriceps?\b/.test(l) || t.has('tri')],
  ['POSTERIOR_CHAIN', (l, t) => /\bglutes?\b/.test(l) || t.has('ghr')],
];

export function classifyAccessoryEffects(rawName: string): AccessoryEffect[] {
  const lower = rawName.toLowerCase();
  const tokens = new Set(lower.split(/[\s(),]+/).filter(Boolean));
  return ACCESSORY_EFFECT_DETECTORS.filter(([, match]) => match(lower, tokens)).map(
    ([effect]) => effect
  );
}

import type {
  ConjugateBar,
  ConjugateEquipment,
  ConjugateExercise,
  ConjugateStance,
} from './conjugate';

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
  ['romanian', (l) => l.includes('romanian')],
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
export const TYPE_DETECTORS: Detector<ConjugateExercise['type']> = [
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
  ['deadlift', (l) => l.includes('deadlift') || l.includes('rack')],
];

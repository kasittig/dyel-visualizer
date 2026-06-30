import {
  type ConjugateAddlWt,
  type ConjugateBar,
  type ConjugateEquipment,
  type ConjugateExercise,
  type ConjugateStance,
  type TrainingSession,
} from '../../types/conjugate';
import { calcE1RM } from '../math/e1rm';
import { parseSheetRows, detectWeightUnit, type RawRow } from './sheetRows';

export function findCol(row: RawRow, keyword: string): string | undefined {
  const re = new RegExp(`^${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`);
  const key = Object.keys(row).find((k) => re.test(k));
  return key !== undefined ? row[key] : undefined;
}

type Detector<T> = Array<[T, (lower: string, tokens: Set<string>) => boolean]>;

function makeParser<T>(detectors: Detector<T>): (lower: string, tokens: Set<string>) => T | null {
  return (lower, tokens) => detectors.find(([, detect]) => detect(lower, tokens))?.[0] ?? null;
}

const BAR_DETECTORS: Detector<ConjugateBar> = [
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

const STANCE_DETECTORS: Detector<ConjugateStance> = [
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

const EQUIPMENT_DETECTORS: Detector<ConjugateEquipment> = [
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

const TYPE_DETECTORS: Detector<ConjugateExercise['type']> = [
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

type RawSession = Omit<TrainingSession, 'unit'> & { unit: 'lbs' | 'kg' | null };

function parseSession(row: RawRow): RawSession | null {
  const dateStr = row['date']?.trim() ?? '';
  let date: Date;
  if (!dateStr) {
    const t = new Date();
    date = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  } else {
    date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(dateStr + 'T00:00:00')
      : new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const weight = parseFloat(findCol(row, 'weight') ?? '');
  const reps = parseInt(row['reps'] ?? '');
  if (isNaN(weight) || isNaN(reps) || reps <= 0) {
    return null;
  }

  const sets = parseInt(findCol(row, 'sets') ?? '') || 1;
  const rpeRaw = parseFloat(row['rpe']?.trim() ?? '');
  const rpe = !isNaN(rpeRaw) && rpeRaw >= 1 && rpeRaw <= 10 ? rpeRaw : null;
  return {
    date,
    sets,
    reps,
    weight,
    e1rm: calcE1RM(weight, reps, rpe),
    unit: detectWeightUnit(Object.keys(row)),
    rpe,
  };
}

export function parseConjugateData(csv: string): Array<[ConjugateExercise, TrainingSession]> {
  const parsed = parseSheetRows(csv);
  if (!parsed) {
    return [];
  }
  const rows = parsed.rows;

  let hasAnyUnit = false;
  const raw: Array<[ConjugateExercise, RawSession]> = [];
  for (const row of rows) {
    const exerciseName = row['exercise'] ?? '';
    if (!exerciseName) {
      continue;
    }
    const lift = nameToExercise(row['exercise']);
    if (!lift) {
      continue;
    }
    const session = parseSession(row);
    if (!session) {
      continue;
    }
    if (session.unit !== null) {
      hasAnyUnit = true;
    }
    raw.push([lift, session]);
  }

  // Only fall back to "lbs" when no unit annotation exists anywhere in the data.
  return raw.map(([ex, s]) => [ex, { ...s, unit: hasAnyUnit ? (s.unit ?? 'lbs') : 'lbs' }]);
}

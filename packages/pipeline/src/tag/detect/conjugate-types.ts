export type ConjugateBar =
  | 'ssb'
  | 'american'
  | 'swiss'
  | 'cambered'
  | 'standard'
  | 'trap'
  | 'zercher'
  | 'duffalo'
  | 'dumbbell'
  | 'bamboo'
  | 'belt'
  | 'goblet';

export const CONJUGATE_BARS = [
  'ssb',
  'american',
  'swiss',
  'cambered',
  'standard',
  'trap',
  'zercher',
  'duffalo',
  'dumbbell',
  'bamboo',
  'belt',
  'goblet',
] as const satisfies readonly ConjugateBar[];

export type ConjugateStance =
  | 'close'
  | 'narrow'
  | 'sumo'
  | 'conventional'
  | 'competition'
  | 'front'
  | 'opposite'
  | 'medium'
  | 'wide'
  | 'romanian'
  | 'slingshot'
  | 'builder';

export const CONJUGATE_STANCES = [
  'close',
  'narrow',
  'sumo',
  'conventional',
  'competition',
  'front',
  'opposite',
  'medium',
  'wide',
  'romanian',
  'slingshot',
  'builder',
] as const satisfies readonly ConjugateStance[];

export type ConjugateEquipment =
  | 'incline'
  | 'decline'
  | 'blocks'
  | 'deficit'
  | 'board'
  | 'pause'
  | 'floor'
  | 'box'
  | 'rack';

export const CONJUGATE_EQUIPMENT = [
  'incline',
  'decline',
  'blocks',
  'deficit',
  'board',
  'pause',
  'floor',
  'box',
  'rack',
] as const satisfies readonly ConjugateEquipment[];

export type ConjugateAddlWt = 'bands' | 'rev. bands' | 'chains';

export const CONJUGATE_ADDL_WTS = [
  'bands',
  'rev. bands',
  'chains',
] as const satisfies readonly ConjugateAddlWt[];

export interface ParsedAddlWt {
  kind: ConjugateAddlWt;
  magnitude: string;
}

export type LiftType = 'squat' | 'bench' | 'deadlift' | 'accessory';

export interface ParsedExercise {
  type: LiftType;
  bar: ConjugateBar | null;
  stance: ConjugateStance | null;
  equipment: ConjugateEquipment | null;
  /** numeric magnitude for equipment modifiers like board/block/deficit count/height, mirroring addlWts magnitude convention; null when not applicable or equipment has no magnitude */
  equipmentMagnitude: string | null;
  addlWts: ParsedAddlWt[];
}

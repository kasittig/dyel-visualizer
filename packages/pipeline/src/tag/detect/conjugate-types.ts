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

export type ConjugateAddlWt = 'bands' | 'rev. bands' | 'chains';

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

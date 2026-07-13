import type { LiftType } from '@dyel/api';

export type PageTab = LiftType | 'calculator' | 'sigma';
export type InputMode = 'url' | 'text';
export type DeadliftStancePreference = 'sumo' | 'conventional' | 'auto';

export const MAIN_TABS = [
  { id: 'squat' as LiftType, label: 'Squat' },
  { id: 'bench' as LiftType, label: 'Bench' },
  { id: 'deadlift' as LiftType, label: 'Deadlift' },
  { id: 'accessory' as LiftType, label: 'Accessories' },
];

import type { LiftType } from '@dyel/api';

export const LIFT_TYPE_ORDER: LiftType[] = ['squat', 'bench', 'deadlift', 'accessory'];

export const LIFT_TYPE_LABELS: Record<LiftType, string> = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  accessory: 'Accessory',
};

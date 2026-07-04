export type Unit = 'lbs' | 'kg';

export interface SetRecord {
  date: number; // day-resolution epoch ms UTC
  exercise: string; // raw name exactly as logged
  weight: number; // ALWAYS kg internally — unit conversion happens in the parser, not here
  reps: number;
  rpe?: number;
  meta?: Record<string, string>; // rawUnit, rawWeight, source, line — audit trail
}

export interface Point {
  t: number; // epoch ms UTC
  v: number;
  series: string; // canonical exercise id
  tags: ReadonlySet<string>;
}

export interface TagQuery {
  all?: string[];
  any?: string[];
  none?: string[];
}

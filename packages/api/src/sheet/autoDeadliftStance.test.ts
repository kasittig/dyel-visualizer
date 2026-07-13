import { describe, it, expect } from 'vitest';
import type { Point, PipelineModel } from '@dyel/pipeline';
import { resolveAutoDeadliftStance } from './autoDeadliftStance';

const pt = (series: string, v: number, t: number): Point => ({ series, v, t, tags: new Set() });

// resolveAutoDeadliftStance only reads `pointsByDeriver`, so the mock only needs that field.
const mockModel = (e1rmPoints: Point[] = []): PipelineModel =>
  ({
    pointsByDeriver: new Map([['e1rm-max-effort', e1rmPoints]]),
  }) as Pick<PipelineModel, 'pointsByDeriver'> as PipelineModel;

describe('resolveAutoDeadliftStance', () => {
  it.each([
    [
      'sumo strictly stronger',
      [pt('deadlift-sumo', 500, 1000), pt('deadlift-conventional', 480, 2000)],
      'sumo',
    ],
    [
      'conventional strictly stronger',
      [pt('deadlift-sumo', 480, 1000), pt('deadlift-conventional', 500, 2000)],
      'conventional',
    ],
    [
      'equal e1RM (tie)',
      [pt('deadlift-sumo', 500, 1000), pt('deadlift-conventional', 500, 2000)],
      'sumo',
    ],
    ['only sumo has data', [pt('deadlift-sumo', 500, 1000)], 'sumo'],
    ['only conventional has data', [pt('deadlift-conventional', 500, 1000)], 'conventional'],
    ['neither has data', [], 'sumo'],
    [
      'multiple points, sumo best is higher',
      [
        pt('deadlift-sumo', 450, 1000),
        pt('deadlift-sumo', 490, 2000),
        pt('deadlift-conventional', 480, 1500),
        pt('deadlift-conventional', 475, 2500),
      ],
      'sumo',
    ],
    [
      'multiple points, conventional best is higher',
      [
        pt('deadlift-sumo', 450, 1000),
        pt('deadlift-sumo', 480, 2000),
        pt('deadlift-conventional', 490, 1500),
        pt('deadlift-conventional', 475, 2500),
      ],
      'conventional',
    ],
  ])('%s', (_, points, expected) => {
    expect(resolveAutoDeadliftStance(mockModel(points))).toBe(expected);
  });
});

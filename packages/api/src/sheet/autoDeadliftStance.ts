import type { PipelineModel } from '@dyel/pipeline';
import { selectBestE1RMPoint } from '../repCalculator/repCalculatorUtils';

/**
 * Resolves which deadlift stance (sumo vs conventional) the lifter is stronger at,
 * based on their all-time best e1RM data from the 'e1rm-max-effort' deriver.
 *
 * Compares the best e1RM for 'deadlift-sumo' vs 'deadlift-conventional'.
 * On tie or if data is missing for either variant, returns 'sumo' (preserves existing default).
 */
export function resolveAutoDeadliftStance(model: PipelineModel): 'sumo' | 'conventional' {
  const e1rmPoints = model.pointsByDeriver.get('e1rm-max-effort') ?? [];

  const sumoPoints = e1rmPoints.filter((p) => p.series === 'deadlift-sumo');
  const convPoints = e1rmPoints.filter((p) => p.series === 'deadlift-conventional');

  const sumoResult = selectBestE1RMPoint(sumoPoints);
  const convResult = selectBestE1RMPoint(convPoints);

  // If only conventional has data, return it
  if (!sumoResult && convResult) {
    return 'conventional';
  }

  // If both have data, return the one with higher e1rm; on tie, default to sumo
  if (sumoResult && convResult) {
    return convResult.e1rm > sumoResult.e1rm ? 'conventional' : 'sumo';
  }

  // If only sumo has data, or neither has data, default to sumo
  return 'sumo';
}

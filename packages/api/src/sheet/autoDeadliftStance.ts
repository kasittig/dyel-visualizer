import type { PipelineModel } from '@dyel/pipeline';
import { selectBestE1RMPoint } from '../repCalculator/repCalculatorUtils';

export function resolveAutoDeadliftStance(model: PipelineModel): 'sumo' | 'conventional' {
  const pts = model.pointsByDeriver.get('e1rm-max-effort') ?? [];
  const sumo = selectBestE1RMPoint(pts.filter((p) => p.series === 'deadlift-sumo'));
  const conv = selectBestE1RMPoint(pts.filter((p) => p.series === 'deadlift-conventional'));

  if (!sumo && conv) {
    return 'conventional';
  }
  return sumo && conv && conv.e1rm > sumo.e1rm ? 'conventional' : 'sumo';
}

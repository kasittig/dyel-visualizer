import type { PipelineModel } from '@dyel/pipeline';
import { buildDatasetsFromModel } from '@dyel/pipeline';
import { TOTAL_CHART_SPECS } from './totalChartSpecs';

const KG_TO_LBS = 2.20462262185;

/**
 * Derives the competition total (squat + bench + deadlift, at the most recent date with a
 * complete total) from a pipeline model, for the given date range and display unit.
 *
 * Pipeline dataset output is always kg; this function converts to the requested display unit.
 *
 * @param model Pipeline model from `runPipelineModel` (via the app's `usePipelineModel()`)
 * @param dateRange Date range to scope the total to; omit `from`/`to` for no date filtering
 * @param unit Display unit for the returned total
 * @returns The most recent total in `unit`, rounded to the nearest whole number, or `null` if
 *   no total is available in range
 */
export function getCompetitionTotal(
  model: PipelineModel,
  dateRange: { from?: Date; to?: Date },
  unit: 'lbs' | 'kg'
): number | null {
  const ui =
    dateRange.from && dateRange.to
      ? { dateRange: [dateRange.from.getTime(), dateRange.to.getTime()] as [number, number] }
      : {};

  const datasets = buildDatasetsFromModel(model, TOTAL_CHART_SPECS, ui);
  const totalRows = datasets['total'] ?? [];
  const last = [...totalRows].reverse().find((row) => row.total !== undefined);

  if (last === undefined) {
    return null;
  }
  return Math.round(unit === 'lbs' ? last.total * KG_TO_LBS : last.total);
}

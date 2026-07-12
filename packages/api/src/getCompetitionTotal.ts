import type { PipelineModel } from '@dyel/pipeline';
import { buildDatasetsFromModel } from '@dyel/pipeline';
import { TOTAL_CHART_SPECS } from './totalChartSpecs';

export function getCompetitionTotal(
  model: PipelineModel,
  dateRange: { from?: Date; to?: Date },
  unit: 'lbs' | 'kg'
): number | null {
  const ui =
    dateRange.from && dateRange.to
      ? { dateRange: [dateRange.from.getTime(), dateRange.to.getTime()] as [number, number] }
      : {};
  const last = [...(buildDatasetsFromModel(model, TOTAL_CHART_SPECS, ui).total ?? [])]
    .reverse()
    .find((row) => row.total !== undefined);

  if (last === undefined) {
    return null;
  }
  return Math.round(unit === 'lbs' ? last.total * 2.20462262185 : last.total);
}

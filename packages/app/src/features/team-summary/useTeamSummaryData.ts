import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { LifterPipelineResult, DisplayUnit } from '@dyel/api';
import {
  latestLiftE1RMs,
  buildMostRecentSessionDetail,
  formatLastSessionParts,
  formatWeight,
  detectDataUnit,
  groupByLiftType,
  isRecordInDateRange,
  TOTAL_CHART_SPECS,
  buildChartDatasets,
  dateRangeToRenderParams,
  mergeRechartsRowsToChartPoints,
} from '@dyel/api';

export interface TeamSummaryRow {
  lifterName: string;
  url: string;
  hasData: boolean;
  squatDisplay: string;
  benchDisplay: string;
  deadliftDisplay: string;
  totalDisplay: string;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
  total: number | null;
  sessionCount: number;
  lastSetDisplay: string;
  dateDisplay: string;
}

export function useTeamSummaryData(results: LifterPipelineResult[]) {
  const erroredLifterCount = results.filter((r) => r.status === 'error').length;

  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const [unit, setUnit] = useState<DisplayUnit>(() => {
    const firstActive = results.find((r) => r.status === 'success');
    return firstActive ? detectDataUnit(groupByLiftType(firstActive.model.tagged)) : 'lbs';
  });

  const toggleUnit = () => setUnit((prev) => (prev === 'lbs' ? 'kg' : 'lbs'));

  const rows = useMemo<TeamSummaryRow[]>(() => {
    const placeholder = (name: string, url: string): TeamSummaryRow => ({
      lifterName: name,
      url,
      hasData: false,
      squatDisplay: '—',
      benchDisplay: '—',
      deadliftDisplay: '—',
      totalDisplay: '—',
      squat: null,
      bench: null,
      deadlift: null,
      total: null,
      sessionCount: 0,
      lastSetDisplay: '—',
      dateDisplay: '—',
    });

    return results.map((res): TeamSummaryRow => {
      if (res.status !== 'success') {
        return placeholder(res.name, res.url);
      }

      // Build chart data using the exact pipeline chain as TotalChart
      const ui = dateRangeToRenderParams(dateRange.from, dateRange.to);
      const datasets = buildChartDatasets(res.model, TOTAL_CHART_SPECS, ui);
      const chartData = mergeRechartsRowsToChartPoints(
        datasets,
        ['squat', 'bench', 'deadlift', 'total'],
        unit
      );

      if (chartData.length === 0) {
        return placeholder(res.name, res.url);
      }

      // Get latest e1RMs per lift
      const e1rms = latestLiftE1RMs(chartData);

      // Get session details (from ALL tagged records, no canonical filter)
      const sessionDetail = buildMostRecentSessionDetail(res.model.tagged);
      const sessionParts = sessionDetail ? formatLastSessionParts(sessionDetail, unit) : null;

      // Count distinct session dates within date range (across all lifts)
      const sessionCount = new Set(
        res.model.tagged
          .filter((r) => isRecordInDateRange(r.date, dateRange.from, dateRange.to))
          .map((r) => r.date)
      ).size;

      return {
        lifterName: res.name,
        url: res.url,
        hasData: true,
        squatDisplay: e1rms.squat !== undefined ? formatWeight(e1rms.squat, unit) : '—',
        benchDisplay: e1rms.bench !== undefined ? formatWeight(e1rms.bench, unit) : '—',
        deadliftDisplay: e1rms.deadlift !== undefined ? formatWeight(e1rms.deadlift, unit) : '—',
        totalDisplay: e1rms.total !== undefined ? formatWeight(e1rms.total, unit) : '—',
        squat: e1rms.squat ?? null,
        bench: e1rms.bench ?? null,
        deadlift: e1rms.deadlift ?? null,
        total: e1rms.total ?? null,
        sessionCount,
        lastSetDisplay: sessionParts?.setLine ?? '—',
        dateDisplay: sessionParts?.date ?? '—',
      };
    });
  }, [results, dateRange, unit]);

  return {
    rows,
    erroredLifterCount,
    dateRange,
    setDateRange,
    unit,
    setUnit,
    toggleUnit,
  };
}

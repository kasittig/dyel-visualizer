import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import {
  buildAccessoryTableRows,
  buildWeeklyAccessoryCategoryExposure,
  formatEffect,
  mapWeaknessesToAccessoryCategories,
  selectDiagnosticVariants,
  summarizeDiagnosticEvidence,
  type AccessoryCategory,
  type WeaknessAccessoryMappingStatus,
} from '@dyel/api';
import { usePipelineModel } from '../../app/PipelineContext';
import { ACCESSORY_CATEGORY_LABELS } from './useAccessoryTable';

export interface WeaknessCoverageRow {
  effect: string;
  effectLabel: string;
  evidenceSummary: string;
  rationale: string;
  status: WeaknessAccessoryMappingStatus;
  categories: {
    category: AccessoryCategory;
    label: string;
    recentExposure: { weekStart: number; weekLabel: string; sessionCount: number }[];
    contributingExercises: string[];
  }[];
}

const EMPTY: WeaknessCoverageRow[] = [];

export function useWeaknessAccessoryCoverage(dateRange: DateRange): WeaknessCoverageRow[] {
  const { status, model } = usePipelineModel();

  return useMemo(() => {
    if (status !== 'success' || !model) {
      return EMPTY;
    }
    const from = dateRange.from?.getTime() ?? Number.NEGATIVE_INFINITY;
    const to = dateRange.to
      ? new Date(
          dateRange.to.getFullYear(),
          dateRange.to.getMonth(),
          dateRange.to.getDate(),
          23,
          59,
          59,
          999
        ).getTime()
      : Number.POSITIVE_INFINITY;
    const exposure = buildWeeklyAccessoryCategoryExposure(
      model.tagged.filter((record) => record.date >= from && record.date <= to)
    );
    const accessoryRows = buildAccessoryTableRows(model.tagged, dateRange.from, dateRange.to);
    const mappings = mapWeaknessesToAccessoryCategories(
      summarizeDiagnosticEvidence(selectDiagnosticVariants(model)).effects
    );

    return mappings.map(({ evidence, categories, status: mappingStatus, rationale }) => ({
      effect: evidence.effect,
      effectLabel: formatEffect(evidence.effect),
      evidenceSummary: `${evidence.belowCount} below-range signal${evidence.belowCount === 1 ? '' : 's'} · ${evidence.aboveCount} above-range signal${evidence.aboveCount === 1 ? '' : 's'}`,
      rationale,
      status: mappingStatus,
      categories: categories.map((category) => ({
        category,
        label: ACCESSORY_CATEGORY_LABELS[category],
        recentExposure: exposure
          .filter((item) => item.category === category)
          .slice(-4)
          .map((item) => ({
            ...item,
            weekLabel: new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }).format(item.weekStart),
          })),
        contributingExercises: accessoryRows
          .filter((row) => row.category === category && row.sessionCountInRange > 0)
          .map((row) => row.label)
          .sort((a, b) => a.localeCompare(b)),
      })),
    }));
  }, [status, model, dateRange.from, dateRange.to]);
}

import { useMemo, useState } from 'react';
import {
  CALIBRATED_PLATES,
  STANDARD_IRON_PLATES,
  calculatePlateLoad,
  convertWeightUnit,
} from '@dyel/api';
import type { DisplayUnit, Plate, PlateInventory, PlateLoadResult } from '@dyel/api';

export type PlateSet = 'calibrated' | 'iron';

export interface PlateGroup {
  plate: Plate;
  count: number;
  label: string;
}

const plateLabel = (plate: Plate) =>
  `${plate.color ? `${plate.color} ` : ''}${plate.weight} lb ${plate.style} plate`;

function groupPlates(plates: readonly Plate[]): PlateGroup[] {
  const groups = new Map<number, PlateGroup>();

  for (const plate of plates) {
    const group = groups.get(plate.weight);
    if (group) {
      group.count += 1;
    } else {
      groups.set(plate.weight, { plate, count: 1, label: plateLabel(plate) });
    }
  }

  return [...groups.values()];
}

function inputNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function displayWeight(pounds: number, unit: DisplayUnit, preserveNonzero = false): string {
  const value = convertWeightUnit(pounds, 'lbs', unit);
  let decimals = unit === 'kg' || !Number.isInteger(value) ? 1 : 0;
  while (preserveNonzero && value !== 0 && Number(value.toFixed(decimals)) === 0 && decimals < 3) {
    decimals += 1;
  }
  return `${decimals === 0 ? value : value.toFixed(decimals)} ${unit === 'lbs' ? 'lb' : 'kg'}`;
}

function loadMessage(
  result: PlateLoadResult,
  loadedTotalDisplay: string,
  differenceDisplay: string,
  sideLoadDescription: string
): string {
  switch (result.status) {
    case 'exact':
      return `Exact ${loadedTotalDisplay} load. ${sideLoadDescription}`;
    case 'closest-under-target':
      return `Closest load without exceeding your target: ${loadedTotalDisplay}, ${differenceDisplay} from target. ${sideLoadDescription}`;
    case 'below-bar':
      return `Target weight must be at least the ${result.barWeight} lb bar weight.`;
    case 'invalid':
      return 'Enter valid target and bar weights greater than or equal to zero.';
  }
}

/** Owns plate-calculator inputs and adapts the API result for rendering and announcements. */
export function usePlateCalculator() {
  const [targetWeight, setTargetWeight] = useState('');
  const [barWeight, setBarWeight] = useState('45');
  const [plateSet, setPlateSet] = useState<PlateSet>('iron');
  const [targetUnit, setTargetUnit] = useState<DisplayUnit>('lbs');

  const inventory: PlateInventory =
    plateSet === 'calibrated' ? CALIBRATED_PLATES : STANDARD_IRON_PLATES;
  const result = useMemo(
    () =>
      calculatePlateLoad({
        targetWeight: convertWeightUnit(inputNumber(targetWeight), targetUnit, 'lbs'),
        barWeight: inputNumber(barWeight),
        inventory,
      }),
    [targetWeight, targetUnit, barWeight, inventory]
  );
  const sidePlateGroups = useMemo(() => groupPlates(result.plates), [result.plates]);
  const sideLoadDescription = useMemo(
    () =>
      sidePlateGroups.length === 0
        ? 'Load no plates on each side.'
        : `Load each side: ${sidePlateGroups
            .map(({ count, label }) => `${count} × ${label}`)
            .join(', ')}.`,
    [sidePlateGroups]
  );
  const loadedTotalDisplay =
    result.loadedTotal === null ? '—' : displayWeight(result.loadedTotal, targetUnit);
  const secondaryUnit: DisplayUnit = targetUnit === 'kg' ? 'lbs' : 'kg';
  const loadedTotalSecondary =
    result.loadedTotal === null ? null : displayWeight(result.loadedTotal, secondaryUnit);
  const differenceDisplay =
    result.difference === null
      ? '—'
      : result.difference === 0
        ? 'Exact'
        : `${result.difference > 0 ? '+' : '−'}${displayWeight(Math.abs(result.difference), targetUnit, true)}`;
  const differenceSecondary =
    result.difference === null || result.difference === 0
      ? null
      : `${result.difference > 0 ? '+' : '−'}${displayWeight(Math.abs(result.difference), secondaryUnit, true)}`;
  const message = loadMessage(result, loadedTotalDisplay, differenceDisplay, sideLoadDescription);

  return {
    targetWeight,
    setTargetWeight,
    targetUnit,
    setTargetUnit,
    barWeight,
    setBarWeight,
    plateSet,
    setPlateSet,
    inventory,
    result,
    sidePlateGroups,
    sideLoadDescription,
    loadedTotalDisplay,
    loadedTotalSecondary,
    differenceDisplay,
    differenceSecondary,
    isLoadable: result.loadedTotal !== null,
    isExact: result.status === 'exact',
    message,
  };
}

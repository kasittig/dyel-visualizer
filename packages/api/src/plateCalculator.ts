export type PlateStyle = 'calibrated' | 'iron';

export type CalibratedPlateColor = 'red' | 'blue' | 'yellow' | 'green' | 'white' | 'black' | 'grey';

export interface Plate {
  readonly weight: number;
  readonly style: PlateStyle;
  readonly color?: CalibratedPlateColor;
}

export type PlateInventory = readonly Plate[];

export type PlateLoadStatus = 'exact' | 'closest-under-target' | 'below-bar' | 'invalid';

export interface PlateLoadInput {
  targetWeight: number;
  barWeight: number;
  inventory: PlateInventory;
}

export interface PlateLoadResult {
  status: PlateLoadStatus;
  targetWeight: number;
  barWeight: number;
  loadedTotal: number | null;
  difference: number | null;
  plates: readonly Plate[];
}

export const CALIBRATED_PLATES: PlateInventory = Object.freeze([
  Object.freeze({ weight: 55, style: 'calibrated' as const, color: 'red' as const }),
  Object.freeze({ weight: 45, style: 'calibrated' as const, color: 'blue' as const }),
  Object.freeze({ weight: 35, style: 'calibrated' as const, color: 'yellow' as const }),
  Object.freeze({ weight: 25, style: 'calibrated' as const, color: 'green' as const }),
  Object.freeze({ weight: 10, style: 'calibrated' as const, color: 'white' as const }),
  Object.freeze({ weight: 5, style: 'calibrated' as const, color: 'black' as const }),
  Object.freeze({ weight: 2.5, style: 'calibrated' as const, color: 'grey' as const }),
]);

export const STANDARD_IRON_PLATES: PlateInventory = Object.freeze([
  Object.freeze({ weight: 45, style: 'iron' as const }),
  Object.freeze({ weight: 25, style: 'iron' as const }),
  Object.freeze({ weight: 10, style: 'iron' as const }),
  Object.freeze({ weight: 5, style: 'iron' as const }),
  Object.freeze({ weight: 2.5, style: 'iron' as const }),
]);

function nonLoadableResult(
  status: Extract<PlateLoadStatus, 'below-bar' | 'invalid'>,
  targetWeight: number,
  barWeight: number
): PlateLoadResult {
  return { status, targetWeight, barWeight, loadedTotal: null, difference: null, plates: [] };
}

export function calculatePlateLoad({
  targetWeight,
  barWeight,
  inventory,
}: PlateLoadInput): PlateLoadResult {
  if (
    !Number.isFinite(targetWeight) ||
    !Number.isFinite(barWeight) ||
    targetWeight < 0 ||
    barWeight < 0
  ) {
    return nonLoadableResult('invalid', targetWeight, barWeight);
  }
  if (targetWeight < barWeight) {
    return nonLoadableResult('below-bar', targetWeight, barWeight);
  }

  const maxPerSideUnits = Math.floor(
    targetWeight - barWeight + Number.EPSILON * Math.max(1, targetWeight, barWeight)
  );
  let remainingUnits = maxPerSideUnits;
  const plates: Plate[] = [];
  for (const plate of inventory) {
    const plateUnits = Math.round(plate.weight * 2);
    while (plateUnits > 0 && remainingUnits >= plateUnits) {
      plates.push(plate);
      remainingUnits -= plateUnits;
    }
  }

  const loadedTotal = barWeight + maxPerSideUnits - remainingUnits;
  const difference = loadedTotal - targetWeight;
  return {
    status: difference === 0 ? 'exact' : 'closest-under-target',
    targetWeight,
    barWeight,
    loadedTotal,
    difference,
    plates,
  };
}

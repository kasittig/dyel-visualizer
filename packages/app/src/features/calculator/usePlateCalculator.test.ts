import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePlateCalculator } from './usePlateCalculator';

describe('usePlateCalculator', () => {
  it('owns the default inputs and adapts an exact calibrated load for display', () => {
    const { result } = renderHook(() => usePlateCalculator());

    expect(result.current).toMatchObject({
      targetWeight: '',
      targetUnit: 'lbs',
      barWeight: '45',
      plateSet: 'iron',
      isLoadable: false,
    });

    act(() => {
      result.current.setPlateSet('calibrated');
      result.current.setTargetWeight('165');
      result.current.setBarWeight('55');
    });

    expect(result.current.result.status).toBe('exact');
    expect(result.current.loadedTotalDisplay).toBe('165 lb');
    expect(result.current.differenceDisplay).toBe('Exact');
    expect(result.current.sidePlateGroups).toEqual([
      expect.objectContaining({ count: 1, label: 'red 55 lb calibrated plate' }),
    ]);
    expect(result.current.message).toBe(
      'Exact 165 lb load. Load each side: 1 × red 55 lb calibrated plate.'
    );
  });

  it.each([
    ['standard iron plates', 'iron', '135', '45', 'exact', '135 lb', 'Exact'],
    ['closest under target', 'calibrated', '164', '55', 'closest-under-target', '160 lb', '−4 lb'],
    ['a target below the bar', 'calibrated', '44', '45', 'below-bar', '—', '—'],
    ['invalid input', 'calibrated', 'not a number', '45', 'invalid', '—', '—'],
  ])(
    'adapts %s',
    (_, plateSet, targetWeight, barWeight, status, loadedTotalDisplay, differenceDisplay) => {
      const { result } = renderHook(() => usePlateCalculator());

      act(() => {
        result.current.setPlateSet(plateSet as 'calibrated' | 'iron');
        result.current.setTargetWeight(targetWeight);
        result.current.setBarWeight(barWeight);
      });

      expect(result.current.result.status).toBe(status);
      expect(result.current.loadedTotalDisplay).toBe(loadedTotalDisplay);
      expect(result.current.differenceDisplay).toBe(differenceDisplay);
      expect(result.current.isExact).toBe(status === 'exact');
      expect(result.current.isLoadable).toBe(['exact', 'closest-under-target'].includes(status));
    }
  );

  it('groups repeated per-side plates and provides an accessible load summary', () => {
    const { result } = renderHook(() => usePlateCalculator());

    act(() => {
      result.current.setPlateSet('calibrated');
      result.current.setTargetWeight('315');
    });

    expect(result.current.sidePlateGroups).toEqual([
      expect.objectContaining({ count: 2, label: 'red 55 lb calibrated plate' }),
      expect.objectContaining({ count: 1, label: 'green 25 lb calibrated plate' }),
    ]);
    expect(result.current.sideLoadDescription).toBe(
      'Load each side: 2 × red 55 lb calibrated plate, 1 × green 25 lb calibrated plate.'
    );
  });

  it('converts a kilogram opener to the closest loadable pound setup', () => {
    const { result } = renderHook(() => usePlateCalculator());

    act(() => {
      result.current.setPlateSet('calibrated');
      result.current.setTargetUnit('kg');
      result.current.setTargetWeight('200');
    });

    expect(result.current.result).toMatchObject({
      status: 'closest-under-target',
      loadedTotal: 440,
    });
    expect(result.current.loadedTotalDisplay).toBe('199.6 kg');
    expect(result.current.loadedTotalSecondary).toBe('440 lb');
    expect(result.current.differenceDisplay).toBe('−0.4 kg');
    expect(result.current.differenceSecondary).toBe('−0.9 lb');
  });
});

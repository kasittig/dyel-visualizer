import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeaknessAccessoryCoverage } from './WeaknessAccessoryCoverage';
import type { WeaknessCoverageRow } from './useWeaknessAccessoryCoverage';

const mapped: WeaknessCoverageRow = {
  effect: 'CORE_DEMAND',
  effectLabel: 'Core Demand',
  evidenceSummary: '2 below-range signals · 0 above-range signals',
  rationale: 'Core demand directly matches the core category.',
  status: 'mapped',
  categories: [
    {
      category: 'core',
      label: 'Core',
      recentExposure: [{ weekStart: 1, weekLabel: 'Aug 3', sessionCount: 2 }],
      contributingExercises: ['Dead Bug', 'Plank'],
    },
  ],
};

describe('WeaknessAccessoryCoverage', () => {
  it('renders the association, exposure, exercises, and keyboard-expandable evidence', () => {
    render(<WeaknessAccessoryCoverage rows={[mapped]} />);

    expect(screen.getByRole('heading', { name: 'Weakness coverage' })).toBeTruthy();
    expect(screen.getByText('Core Demand')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Core sessions by week' }).textContent).toContain(
      'Week of Aug 3'
    );
    expect(screen.getByText(/Contributing exercises: Dead Bug, Plank/)).toBeTruthy();
    expect(screen.getByText(mapped.rationale)).toBeTruthy();

    const summary = screen.getByText(/Evidence · 2 below-range signals/);
    summary.focus();
    fireEvent.click(summary);
    expect(screen.getByText(/does not show that any accessory caused or corrected/)).toBeTruthy();
  });

  it.each([
    ['no weakness', [], 'No current weakness signals are available'],
    [
      'unsupported mapping',
      [{ ...mapped, status: 'unsupported' as const, categories: [] }],
      'does not have a safe broad-category association',
    ],
    [
      'unmapped quality',
      [{ ...mapped, status: 'unmapped' as const, categories: [] }],
      'not available in the reviewed association map',
    ],
    [
      'mapped without exposure',
      [
        {
          ...mapped,
          categories: [{ ...mapped.categories[0]!, recentExposure: [], contributingExercises: [] }],
        },
      ],
      'No classified sessions in this range',
    ],
  ])('shows an honest %s state', (_, rows, message) => {
    render(<WeaknessAccessoryCoverage rows={rows} />);
    expect(screen.getByText(new RegExp(message))).toBeTruthy();
  });
});

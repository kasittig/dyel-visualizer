import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CategoryEffectivenessEvidence,
  CategoryEffectivenessGuide,
} from './CategoryEffectivenessEvidence';
import type { CategoryEffectivenessRow } from './useCategoryEffectivenessEvidence';

const row = (status: CategoryEffectivenessRow['status']): CategoryEffectivenessRow => ({
  id: `core:${status}`,
  category: 'core',
  categoryLabel: 'Core',
  qualityLabel: 'Core Demand',
  status,
  statusLabel: {
    'insufficient-data': 'Insufficient data',
    'possible-improvement': 'Possible improvement',
    'no-clear-change': 'No clear change',
    'possible-worsening': 'Possible worsening',
  }[status],
  exposurePeriod: 'Aug 1, 2026–Aug 15, 2026',
  outcomePeriod: 'Aug 16, 2026–Aug 31, 2026',
  sessionSummary: '4 sessions across 2 weeks · 2.0 per week',
  baselineDisplay: '0.800',
  outcomeDisplay: '0.900',
  changeDisplay: '+0.100',
  evidenceSummary:
    '2 follow-up observations · 6 contributing lift signals (2 baseline, 4 follow-up)',
  interpretation: 'Category exposure was followed by possible improvement.',
  resultSummary:
    status === 'insufficient-data'
      ? 'There is not enough category and lift-quality history to compare the two periods.'
      : 'Core Demand score moved from 0.800 earlier to 0.900 later (+0.100). Higher scores mean better performance relative to the quality benchmark.',
  requirementDisplay:
    status === 'insufficient-data' ? 'Needed: 1 category session in the earlier period.' : null,
});

describe('CategoryEffectivenessEvidence', () => {
  afterEach(cleanup);
  it('keeps secondary guidance and evidence collapsed until requested', () => {
    render(
      <>
        <CategoryEffectivenessGuide
          evidence={{
            windowPolicy: 'Selected range split into two periods.',
            unavailableReason: null,
            rows: [row('possible-improvement')],
          }}
        />
        <CategoryEffectivenessEvidence rows={[row('possible-improvement')]} />
      </>
    );
    expect(screen.getByRole('heading', { name: 'Association evidence' })).toBeTruthy();
    expect(screen.getAllByText(/2.0 per week/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Higher scores (are|mean) better/).length).toBeGreaterThan(0);

    const guideSummary = screen.getByText('How to read these associations');
    const guide = guideSummary.closest('details')!;
    expect(guide.hasAttribute('open')).toBe(false);
    fireEvent.click(guideSummary);
    expect(guide.hasAttribute('open')).toBe(true);
    expect(screen.getByText(/not proof of cause/i)).toBeTruthy();
    expect(screen.getByText(/Minimum evidence: 1 category session/)).toBeTruthy();

    const summary = screen.getByText('See dates, sample size, and calculation');
    const details = summary.closest('details')!;
    expect(details.hasAttribute('open')).toBe(false);
    summary.focus();
    fireEvent.click(summary);
    expect(details.hasAttribute('open')).toBe(true);
    expect(screen.getByText('Aug 1, 2026–Aug 15, 2026')).toBeTruthy();
    expect(screen.getByText('Aug 16, 2026–Aug 31, 2026')).toBeTruthy();
    expect(screen.getByText('+0.100')).toBeTruthy();
    expect(screen.getAllByText(/6 contributing lift signals/).length).toBeGreaterThan(0);
    expect(screen.getByText(/timing and association only/)).toBeTruthy();
  });

  it('renders every honest result state as text', () => {
    render(
      <CategoryEffectivenessEvidence
        rows={[
          row('insufficient-data'),
          row('possible-improvement'),
          row('no-clear-change'),
          row('possible-worsening'),
        ]}
      />
    );
    for (const label of [
      'Insufficient data',
      'Possible improvement',
      'No clear change',
      'Possible worsening',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('Needed: 1 category session in the earlier period.')).toBeTruthy();
    expect(screen.getAllByLabelText('Core Demand analysis periods')).toHaveLength(4);
    for (const summary of screen.getAllByText('See dates, sample size, and calculation')) {
      expect(summary.closest('details')!.hasAttribute('open')).toBe(false);
    }
  });

  it('keeps missing history explicit in the shared guide', () => {
    render(
      <CategoryEffectivenessGuide
        evidence={{
          windowPolicy: 'Choose a complete range.',
          unavailableReason: 'A complete selected date range is required.',
          rows: [],
        }}
      />
    );
    expect(screen.getByText('A complete selected date range is required.')).toBeTruthy();
  });
});

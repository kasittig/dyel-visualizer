import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosticVariant } from '@dyel/api';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';

vi.mock('./usePipelineDiagnostics');
const mockUsePipelineDiagnostics = vi.mocked(usePipelineDiagnostics);
const attentionSummary = {
  belowCount: 1,
  aboveCount: 1,
  leadingBelowEffectDisplay: 'Power',
  leadingBelowEffectCount: 1,
};

const variant = (status: DiagnosticVariant['status'], averageIndex: number) => ({
  canonical: status,
  displayName: status,
  lift: 'lift:squat',
  effects: [],
  status,
  fittedStatus: averageIndex < 90 ? 'weakness' : averageIndex > 110 ? 'overperforming' : 'optimal',
  ratio: averageIndex / 100,
  actualE1rmKg: averageIndex,
  expectedE1rmKg: 100,
  baselineE1rmKg: 110,
  expectedFactor: 0.91,
  latestAt: Date.UTC(2026, 0, 10),
  latestSet: { weight: 82, reps: 3, rpe: 9 },
  previousE1rmKg: averageIndex - 2,
  observationCount: 4,
  comparisonCount: 3,
  staleDays: status === 'stale' ? 117 : 3,
  averageIndex,
  expectedBaseline: '90-110%',
  isCompLift: false,
  effectsDisplay: status === 'weakness' ? 'Paused, +20 lb' : '—',
  actualE1rmDisplay: `${averageIndex} lb`,
  expectedE1rmDisplay: '100 lb',
  deltaPercent: averageIndex - 100,
  deltaDisplay: `${averageIndex > 100 ? '+' : ''}${(averageIndex - 100).toFixed(1)}%`,
  ageDays: status === 'stale' ? 117 : 3,
  ageDisplay: status === 'stale' ? '117 days ago' : '3 days ago',
  latestDateDisplay: 'Jan 10, 2026',
  latestSetDisplay: `${averageIndex} lb × 3 @9`,
  trendDisplay: '+2.0% vs prior observation',
  observationDisplay: '4 observations · 3 fitted comparisons',
  calculationDisplay: '110.0 lb baseline × 91.0% = 100.1 lb expected',
  rationaleDisplay: 'The latest e1RM is 18.0% below its expected value.',
});

describe('DiagnosticsPanel', () => {
  beforeEach(() => {
    mockUsePipelineDiagnostics.mockReturnValue({
      variants: [
        variant('weakness', 82),
        variant('optimal', 100),
        variant('overperforming', 118),
        variant('stale', 95),
      ],
      hasDeadlift: false,
      weakEffects: [],
      overtrainedEffects: [],
      needsData: [],
      attentionSummary,
    });
  });

  it('describes every status and presents actual-versus-expected evidence with recency', () => {
    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);

    ['Below expected', 'On target', 'Above expected', 'Outdated'].forEach((label) =>
      expect(screen.getByText(label)).toBeDefined()
    );
    [
      'weakness: Below expected. Expand diagnostic',
      'optimal: On target. Expand diagnostic',
      'overperforming: Above expected. Expand diagnostic',
      'stale: Outdated, last tested 117 days ago. Expand diagnostic',
    ].forEach((name) => fireEvent.click(screen.getByRole('button', { name })));
    const weaknessDetails = within(container.querySelector('#diagnostic-weakness-details')!);
    expect(weaknessDetails.getByText('82 lb')).toBeDefined();
    expect(weaknessDetails.getByText('100 lb')).toBeDefined();
    expect(weaknessDetails.getByText('-18.0%')).toBeDefined();
    expect(weaknessDetails.getByText('Fitted index 82.0%')).toBeDefined();
    expect(weaknessDetails.getByText('Below target range')).toBeDefined();
    expect(screen.getAllByText('Target range 90-110%')).toHaveLength(4);
    expect(weaknessDetails.getByText(/Tested 3 days ago/)).toBeDefined();
    expect(
      within(container.querySelector('#diagnostic-stale-details')!).getByText(/Tested 117 days ago/)
    ).toBeDefined();
    expect(screen.getByText(/Retest recommended/)).toBeDefined();
    expect(screen.getByText('Last tested 117 days ago')).toBeDefined();
    expect(screen.getByText('Paused, +20 lb')).toBeDefined();
    expect(screen.getAllByText('Recent trend')).toHaveLength(4);
    expect(weaknessDetails.getByText('Jan 10, 2026 · 82 lb × 3 @9 · 82 lb e1RM')).toBeDefined();
    expect(screen.getAllByText('+2.0% vs prior observation')).toHaveLength(4);
    expect(screen.getAllByText('4 observations · 3 fitted comparisons')).toHaveLength(4);
    expect(screen.getAllByText('Expected calculation')).toHaveLength(4);
    expect(screen.getAllByText('Why this status')).toHaveLength(4);
    expect(screen.queryByText('Overtrained')).toBeNull();
    expect(screen.getByText('Sort by')).toBeDefined();
  });

  it('renders effect filters as toggle buttons', () => {
    mockUsePipelineDiagnostics.mockReturnValue({
      variants: [variant('weakness', 82)],
      hasDeadlift: false,
      weakEffects: ['paused'],
      overtrainedEffects: [],
      needsData: [],
      attentionSummary,
    });

    render(<DiagnosticsPanel liftType="squat" unit="lbs" />);

    expect(screen.getByRole('button', { name: 'Paused' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
    expect(screen.getByText('Effects on below-expected variations:')).toBeDefined();
  });

  it('labels current and fitted signals independently when they disagree', () => {
    mockUsePipelineDiagnostics.mockReturnValue({
      variants: [
        {
          ...variant('weakness', 118),
          actualE1rmKg: 93,
          actualE1rmDisplay: '205 lb',
          expectedE1rmDisplay: '220 lb',
          ratio: 0.93,
          deltaPercent: -7,
          deltaDisplay: '-7.0%',
        },
      ],
      hasDeadlift: false,
      weakEffects: [],
      overtrainedEffects: [],
      needsData: [],
      attentionSummary,
    });

    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);
    fireEvent.click(
      within(container).getByRole('button', {
        name: 'weakness: Below expected. Expand diagnostic',
      })
    );
    const details = within(container.querySelector('#diagnostic-weakness-details')!);
    expect(within(container).getByText('Below expected')).toBeDefined();
    expect(details.getByText('205 lb')).toBeDefined();
    expect(details.getByText('220 lb')).toBeDefined();
    expect(details.getByText('-7.0%')).toBeDefined();
    expect(details.getByText('Fitted index 118.0%')).toBeDefined();
    expect(details.getByText('Above target range')).toBeDefined();
  });

  it('collapses and expands individual diagnostic rows', () => {
    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);

    const expand = container.querySelector<HTMLButtonElement>(
      '[aria-controls="diagnostic-weakness-details"]'
    )!;
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('#diagnostic-weakness-details')).toBeNull();
    fireEvent.click(expand);
    expect(container.querySelector('#diagnostic-weakness-details')).not.toBeNull();
  });

  it('synchronizes expanded evidence with the variation chart highlight', () => {
    const onVariationClick = vi.fn();
    const { container } = render(
      <DiagnosticsPanel liftType="squat" unit="lbs" onVariationClick={onVariationClick} />
    );
    fireEvent.click(
      within(container).getByRole('button', {
        name: 'weakness: Below expected. Expand diagnostic',
      })
    );
    fireEvent.click(container.querySelector('#diagnostic-weakness-details')!);

    expect(onVariationClick).toHaveBeenCalledWith('weakness');
  });

  it('announces the active sort criterion and direction', () => {
    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);
    const diagnostics = within(container);
    fireEvent.click(
      diagnostics.getByRole('button', {
        name: 'weakness: Below expected. Expand diagnostic',
      })
    );

    const statusSort = diagnostics.getByRole('button', { name: 'Sort by Status' });
    expect(statusSort.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(statusSort);
    expect(
      diagnostics
        .getByRole('button', { name: 'Status, sorted ascending' })
        .getAttribute('aria-pressed')
    ).toBe('true');
    fireEvent.click(diagnostics.getByRole('button', { name: 'Status, sorted ascending' }));
    expect(diagnostics.getByRole('button', { name: 'Status, sorted descending' })).toBeDefined();
    expect(container.querySelector('#diagnostic-weakness-details')).not.toBeNull();
  });

  it('renders unassessed variations with a reason and next action', () => {
    mockUsePipelineDiagnostics.mockReturnValue({
      variants: [],
      hasDeadlift: false,
      weakEffects: [],
      overtrainedEffects: [],
      needsData: [
        {
          canonical: 'bench-bands',
          displayName: 'Bench (Bands)',
          lift: 'lift:bench',
          reason: 'missing-factor',
          reasonDisplay: 'Needs comparison history',
          actionDisplay:
            'Log this variation alongside its competition lift to establish an expected relationship.',
        },
      ],
      attentionSummary: {
        belowCount: 0,
        aboveCount: 0,
        leadingBelowEffectDisplay: null,
        leadingBelowEffectCount: 0,
      },
    });

    const { container } = render(<DiagnosticsPanel liftType="bench" unit="lbs" />);
    const diagnostics = within(container);
    expect(diagnostics.getByRole('heading', { name: 'Needs data' })).toBeDefined();
    expect(diagnostics.getByText('Bench (Bands)')).toBeDefined();
    expect(diagnostics.getByText('Needs comparison history')).toBeDefined();
    expect(diagnostics.getByText(/Log this variation alongside/)).toBeDefined();
    expect(diagnostics.queryByText('Sort by')).toBeNull();
  });

  it('summarizes current findings before the detailed rows', () => {
    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);
    const summary = within(
      container.querySelector('[aria-labelledby="diagnostic-squat-attention"]')!
    );

    expect(summary.getByText('What needs attention')).toBeDefined();
    expect(
      summary.getByRole('heading', {
        name: '1 variation below expected · 1 variation above expected',
      })
    ).toBeDefined();
    expect(summary.getByText(/Power/)).toBeDefined();
    expect(summary.getByText(/1 below-expected variation/)).toBeDefined();
  });

  it('reports when every current finding is in range', () => {
    mockUsePipelineDiagnostics.mockReturnValue({
      variants: [variant('optimal', 100), variant('stale', 95)],
      hasDeadlift: false,
      weakEffects: [],
      overtrainedEffects: [],
      needsData: [],
      attentionSummary: {
        belowCount: 0,
        aboveCount: 0,
        leadingBelowEffectDisplay: null,
        leadingBelowEffectCount: 0,
      },
    });

    render(<DiagnosticsPanel liftType="squat" unit="lbs" />);
    expect(
      screen.getByRole('heading', { name: 'No current findings need attention' })
    ).toBeDefined();
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosticVariant } from '@dyel/api';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';

vi.mock('./usePipelineDiagnostics');
const mockUsePipelineDiagnostics = vi.mocked(usePipelineDiagnostics);

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
    });
  });

  it('describes every status and presents actual-versus-expected evidence with recency', () => {
    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);

    ['Below expected', 'On target', 'Above expected', 'Needs retest'].forEach((label) =>
      expect(screen.getByText(label)).toBeDefined()
    );
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
    expect(screen.getByText('Paused, +20 lb')).toBeDefined();
    expect(screen.queryByText('Overtrained')).toBeNull();
    expect(screen.getByText('Sort by')).toBeDefined();
  });

  it('renders effect filters as toggle buttons', () => {
    mockUsePipelineDiagnostics.mockReturnValue({
      variants: [variant('weakness', 82)],
      hasDeadlift: false,
      weakEffects: ['paused'],
      overtrainedEffects: [],
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
    });

    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);
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

    const collapse = container.querySelector<HTMLButtonElement>(
      '[aria-controls="diagnostic-weakness-details"]'
    )!;
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#diagnostic-weakness-details')).not.toBeNull();
    fireEvent.click(collapse);

    expect(container.querySelector('#diagnostic-weakness-details')).toBeNull();
    const expand = container.querySelector<HTMLButtonElement>(
      '[aria-controls="diagnostic-weakness-details"]'
    )!;
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(expand);
    expect(container.querySelector('#diagnostic-weakness-details')).not.toBeNull();
  });

  it('announces the active sort criterion and direction', () => {
    const { container } = render(<DiagnosticsPanel liftType="squat" unit="lbs" />);
    const diagnostics = within(container);

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
  });
});

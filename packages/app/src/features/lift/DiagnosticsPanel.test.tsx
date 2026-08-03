import { render, screen } from '@testing-library/react';
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
    render(<DiagnosticsPanel liftType="squat" unit="lbs" />);

    ['Below range', 'In range', 'Above range', 'Needs retest'].forEach((label) =>
      expect(screen.getByText(label)).toBeDefined()
    );
    expect(screen.getByText('82 lb')).toBeDefined();
    expect(screen.getAllByText('100 lb')).toHaveLength(5);
    ['-18.0% below', '0.0% at expectation', '+18.0% above', '-5.0% below'].forEach((text) =>
      expect(screen.getByText(text)).toBeDefined()
    );
    expect(screen.getAllByText('Tested 3 days ago')).toHaveLength(3);
    expect(screen.getByText(/Tested 117 days ago/)).toBeDefined();
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
    expect(screen.getByText('Effects on below-range variations:')).toBeDefined();
  });
});

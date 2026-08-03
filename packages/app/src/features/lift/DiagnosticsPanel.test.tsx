import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosticVariant } from '@dyel/api';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { usePipelineDiagnostics } from './usePipelineDiagnostics';

vi.mock('./usePipelineDiagnostics');
const mockUsePipelineDiagnostics = vi.mocked(usePipelineDiagnostics);

const variant = (status: DiagnosticVariant['status'], averageIndex: number): DiagnosticVariant => ({
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

  it('describes every status neutrally and presents its evidence as a direct comparison', () => {
    render(<DiagnosticsPanel liftType="squat" unit="lbs" />);

    ['Below range', 'In range', 'Above range', 'Outdated'].forEach((label) =>
      expect(screen.getByText(label)).toBeDefined()
    );
    ['82.0% vs 90-110%', '100.0% vs 90-110%', '118.0% vs 90-110%', '95.0% vs 90-110%'].forEach(
      (evidence) => expect(screen.getByText(evidence)).toBeDefined()
    );
    expect(screen.queryByText('Overtrained')).toBeNull();
    expect(screen.getByText('Performance vs expected')).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PipelineModel, AthleteContext, RawInput } from '@dyel/pipeline';
import { PipelineProvider, usePipelineModel } from './PipelineContext';

vi.mock('../utils/rawInputUtils');
vi.mock('@dyel/pipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dyel/pipeline')>();
  return {
    ...actual,
    runPipelineModel: vi.fn(
      (raw: RawInput[], athlete: AthleteContext): PipelineModel => ({
        model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
        diagnostics: { byCanonical: new Map(), allFindings: [] },
        unknownExercises: [],
        unnormalized: [],
        parseErrors: [],
        pointsByDeriver: new Map(),
        pointsByLabelByDeriver: new Map(),
        pointsByDeriverAdjusted: new Map(),
        athlete,
      })
    ),
  };
});

const mockRunPipelineModel = vi.mocked((await import('@dyel/pipeline')).runPipelineModel);

function TestConsumer({ id }: { id: string }) {
  const { status, model } = usePipelineModel();
  return (
    <div data-testid={`consumer-${id}`}>
      Status: {status}, Model: {model ? 'present' : 'null'}
    </div>
  );
}

function TestConsumerThrows() {
  usePipelineModel();
  return <div>Should not render</div>;
}

const mockAthlete: AthleteContext = {
  sex: 'M',
  bodyweight: 90,
  deadliftStance: 'sumo',
};

const mockRawInput1: RawInput = {
  name: 'test1.txt',
  content: 'sample data 1',
};

const mockRawInput2: RawInput = {
  name: 'test2.txt',
  content: 'sample data 2',
};

// Mock useResolvedRawInput to return controlled raw input
const mockUseResolvedRawInput = vi.mocked(
  (await import('../utils/rawInputUtils')).useResolvedRawInput
);

describe('PipelineContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunPipelineModel.mockImplementation((raw: RawInput[], athlete: AthleteContext) => ({
      model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
      diagnostics: { byCanonical: new Map(), allFindings: [] },
      unknownExercises: [],
      unnormalized: [],
      parseErrors: [],
      pointsByDeriver: new Map(),
      pointsByLabelByDeriver: new Map(),
      pointsByDeriverAdjusted: new Map(),
      athlete,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('memoizes runPipelineModel and calls it exactly once for a given raw/athlete pair', async () => {
    mockUseResolvedRawInput.mockReturnValue({
      status: 'success',
      raw: [mockRawInput1],
    });

    const { rerender } = render(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test"
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id="1" />
      </PipelineProvider>
    );

    expect(mockRunPipelineModel).toHaveBeenCalledTimes(1);
    expect(mockRunPipelineModel).toHaveBeenCalledWith([mockRawInput1], mockAthlete);

    // Rerender with same props should NOT call runPipelineModel again
    rerender(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test"
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id="1" />
      </PipelineProvider>
    );

    expect(mockRunPipelineModel).toHaveBeenCalledTimes(1);
  });

  it('calls runPipelineModel once even with multiple consumers', () => {
    mockUseResolvedRawInput.mockReturnValue({
      status: 'success',
      raw: [mockRawInput1],
    });

    render(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test"
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id="1" />
        <TestConsumer id="2" />
      </PipelineProvider>
    );

    // Should still be called exactly once, not once per consumer
    expect(mockRunPipelineModel).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId(/^consumer-/)).toHaveLength(2);
  });

  it('recomputes model when raw input changes', () => {
    mockUseResolvedRawInput.mockReturnValue({
      status: 'success',
      raw: [mockRawInput1],
    });

    const { rerender } = render(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test1"
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id="1" />
      </PipelineProvider>
    );

    expect(mockRunPipelineModel).toHaveBeenCalledTimes(1);
    expect(mockRunPipelineModel).toHaveBeenNthCalledWith(1, [mockRawInput1], mockAthlete);

    // Change raw input - update mock before rerender
    mockUseResolvedRawInput.mockReturnValue({
      status: 'success',
      raw: [mockRawInput2],
    });

    rerender(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test2"
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id="1" />
      </PipelineProvider>
    );

    // Should be called again with new raw input
    expect(mockRunPipelineModel).toHaveBeenCalledTimes(2);
    expect(mockRunPipelineModel).toHaveBeenNthCalledWith(2, [mockRawInput2], mockAthlete);
  });

  it('recomputes model when athlete context changes', () => {
    mockUseResolvedRawInput.mockReturnValue({
      status: 'success',
      raw: [mockRawInput1],
    });

    const { rerender } = render(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test"
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id="1" />
      </PipelineProvider>
    );

    expect(mockRunPipelineModel).toHaveBeenCalledTimes(1);

    // Change athlete stance
    const updatedAthlete: AthleteContext = {
      sex: 'M',
      bodyweight: 90,
      deadliftStance: 'conventional',
    };

    rerender(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test"
        refreshToken={0}
        athlete={updatedAthlete}
      >
        <TestConsumer id="1" />
      </PipelineProvider>
    );

    // Should be called again with new athlete
    expect(mockRunPipelineModel).toHaveBeenCalledTimes(2);
    expect(mockRunPipelineModel).toHaveBeenLastCalledWith([mockRawInput1], updatedAthlete);
  });

  it.each([
    ['idle', { status: 'idle' as const, raw: [] }],
    ['loading', { status: 'loading' as const, raw: [] }],
    ['error', { status: 'error' as const, raw: [] }],
  ])('propagates %s status from useResolvedRawInput', (label, mockReturnValue) => {
    mockUseResolvedRawInput.mockReturnValue(mockReturnValue);

    render(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText=""
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id={label} />
      </PipelineProvider>
    );

    const consumer = screen.getByTestId(`consumer-${label}`);
    expect(consumer.textContent).toContain(`Status: ${label}`);
    expect(consumer.textContent).toContain('Model: null');
    expect(mockRunPipelineModel).not.toHaveBeenCalled();
  });

  it('handles runPipelineModel errors gracefully', () => {
    mockUseResolvedRawInput.mockReturnValue({
      status: 'success',
      raw: [mockRawInput1],
    });
    mockRunPipelineModel.mockImplementation(() => {
      throw new Error('Pipeline error');
    });

    render(
      <PipelineProvider
        inputMode="text"
        url=""
        pastedText="test"
        refreshToken={0}
        athlete={mockAthlete}
      >
        <TestConsumer id="1" />
      </PipelineProvider>
    );

    const consumer = screen.getByTestId('consumer-1');
    expect(consumer.textContent).toContain('Status: error');
    expect(consumer.textContent).toContain('Model: null');
  });

  it('throws error when usePipelineModel is called outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumerThrows />);
    }).toThrow('usePipelineModel must be used inside a PipelineProvider');

    consoleError.mockRestore();
  });
});

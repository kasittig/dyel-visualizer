import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PipelineModel, AthleteContext } from '@dyel/api';
import { PipelineProvider, usePipelineModel } from './PipelineContext';

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

const mockModel: PipelineModel = {
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
  diagnostics: { byCanonical: new Map(), allFindings: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  tagged: [],
  pointsByDeriver: new Map(),
  pointsByLabelByDeriver: new Map(),
  pointsByDeriverAdjusted: new Map(),
  athlete: mockAthlete,
};

describe('PipelineContext', () => {
  afterEach(() => {
    cleanup();
  });

  it('passes success status and model through context', () => {
    render(
      <PipelineProvider status="success" model={mockModel}>
        <TestConsumer id="success" />
      </PipelineProvider>
    );

    const consumer = screen.getByTestId('consumer-success');
    expect(consumer.textContent).toContain('Status: success');
    expect(consumer.textContent).toContain('Model: present');
  });

  it('passes idle status through context', () => {
    render(
      <PipelineProvider status="idle" model={null}>
        <TestConsumer id="idle" />
      </PipelineProvider>
    );

    const consumer = screen.getByTestId('consumer-idle');
    expect(consumer.textContent).toContain('Status: idle');
    expect(consumer.textContent).toContain('Model: null');
  });

  it('passes loading status through context', () => {
    render(
      <PipelineProvider status="loading" model={null}>
        <TestConsumer id="loading" />
      </PipelineProvider>
    );

    const consumer = screen.getByTestId('consumer-loading');
    expect(consumer.textContent).toContain('Status: loading');
    expect(consumer.textContent).toContain('Model: null');
  });

  it('passes error status through context', () => {
    render(
      <PipelineProvider status="error" model={null}>
        <TestConsumer id="error" />
      </PipelineProvider>
    );

    const consumer = screen.getByTestId('consumer-error');
    expect(consumer.textContent).toContain('Status: error');
    expect(consumer.textContent).toContain('Model: null');
  });

  it('makes context available to multiple consumers', () => {
    render(
      <PipelineProvider status="success" model={mockModel}>
        <TestConsumer id="1" />
        <TestConsumer id="2" />
      </PipelineProvider>
    );

    expect(screen.getAllByTestId(/^consumer-/)).toHaveLength(2);
    expect(screen.getByTestId('consumer-1').textContent).toContain('Status: success');
    expect(screen.getByTestId('consumer-2').textContent).toContain('Status: success');
  });

  it('throws error when usePipelineModel is called outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumerThrows />);
    }).toThrow('usePipelineModel must be used inside a PipelineProvider');

    consoleError.mockRestore();
  });
});

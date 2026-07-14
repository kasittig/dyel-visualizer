import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { AthleteContext } from '@dyel/api';
import { PipelineProvider, usePipelineModel, type PipelineStatus } from './PipelineContext';
import { pipelineModelMock } from '../test/helpers/pipelineModelFactory';

function TestConsumer({ id }: { id: string }) {
  const { status, model } = usePipelineModel();
  return (
    <div data-testid={`c-${id}`}>
      Status: {status}, Model: {model ? 'present' : 'null'}
    </div>
  );
}

function TestConsumerThrows() {
  usePipelineModel();
  return null;
}

const mockAthlete: AthleteContext = { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' };
const mockModel = pipelineModelMock({ athlete: mockAthlete });

describe('PipelineContext', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ['success', 'success' as PipelineStatus, mockModel, 'Model: present'],
    ['idle', 'idle' as PipelineStatus, null, 'Model: null'],
    ['loading', 'loading' as PipelineStatus, null, 'Model: null'],
    ['error', 'error' as PipelineStatus, null, 'Model: null'],
  ])('passes %s status and model through context', (id, status, model, modelExpect) => {
    render(
      <PipelineProvider status={status} model={model}>
        <TestConsumer id={id} />
      </PipelineProvider>
    );
    const consumer = screen.getByTestId(`c-${id}`);
    expect(consumer.textContent).toContain(`Status: ${status}`);
    expect(consumer.textContent).toContain(modelExpect);
  });

  it('supports multiple consumers and throws on orphaned usage', () => {
    render(
      <PipelineProvider status="success" model={mockModel}>
        <TestConsumer id="1" />
        <TestConsumer id="2" />
      </PipelineProvider>
    );
    expect(screen.getAllByTestId(/^c-/)).toHaveLength(2);

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<TestConsumerThrows />);
    }).toThrow('usePipelineModel must be used inside a PipelineProvider');
    consoleError.mockRestore();
  });
});

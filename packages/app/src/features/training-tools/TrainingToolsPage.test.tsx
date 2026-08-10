import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TrainingToolsPage } from './TrainingToolsPage';
import { PipelineProvider } from '../../app/PipelineContext';

const renderPage = () =>
  render(
    <PipelineProvider status="idle" model={null}>
      <TrainingToolsPage />
    </PipelineProvider>
  );

describe('TrainingToolsPage', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('offers recognizable canonical tool entry points without a connected sheet', () => {
    window.history.replaceState({}, '', '/dyel-visualizer/?page=tools');
    renderPage();
    const shortcuts = screen.getByRole('navigation', { name: 'Training tool shortcuts' });
    const plate = within(shortcuts).getByRole('button', { name: 'Plate calculator' });
    const alternatives = within(shortcuts).getByRole('button', { name: 'Exercise alternatives' });
    const rep = within(shortcuts).getByRole('button', { name: 'Rep & e1RM calculator' });
    expect(plate.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('region', { name: 'Plate calculator' })).toBeTruthy();
    fireEvent.click(alternatives);
    expect(screen.getByRole('region', { name: 'Exercise alternatives' })).toBeTruthy();
    fireEvent.click(rep);
    expect(screen.getByRole('region', { name: 'Rep and e1RM calculator' })).toBeTruthy();
  });

  it('calculates in manual mode without connected training data', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Rep & e1RM calculator' }));
    fireEvent.change(screen.getByLabelText('Estimated one-rep max'), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '5' } });
    expect(
      Number((screen.getByLabelText('Weight (lbs)') as HTMLInputElement).value)
    ).toBeGreaterThan(0);
  });

  it('keeps the embedded plate calculator functional and keyboard-operable', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Target weight (lb)'), { target: { value: '315' } });
    expect(screen.getByText('315 lb')).toBeTruthy();
    const calibrated = screen.getByRole('button', { name: 'Calibrated' });
    calibrated.focus();
    fireEvent.click(calibrated);
    expect(calibrated.getAttribute('aria-pressed')).toBe('true');
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EffortInput } from './EffortInput';

afterEach(cleanup);

const renderEffortInput = (overrides?: Partial<Parameters<typeof EffortInput>[0]>) => {
  const props = {
    mode: 'rpe' as const,
    value: 5,
    onModeChange: vi.fn(),
    onValueChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<EffortInput {...props} />), props };
};

describe('EffortInput', () => {
  it.each([
    ['rpe mode', 'rpe' as const, 'RPE', 10, 0.5],
    ['pct mode', 'pct' as const, '%', 100, 1],
  ])(
    'renders with correct attributes and active button in %s',
    (_, mode, buttonLabel, maxValue, stepValue) => {
      renderEffortInput({ mode });
      const buttons = screen.getAllByRole('button');
      const modeButton = buttons.find((b) => b.textContent === buttonLabel);
      const input = screen.getByRole('spinbutton') as HTMLInputElement;

      expect(modeButton?.className).toMatch(/chipActive/);
      expect(input.min).toBe('1');
      expect(input.max).toBe(maxValue.toString());
      expect(input.step).toBe(stepValue.toString());
    }
  );

  it.each([
    ['rpe to pct', 'rpe' as const, '%'],
    ['pct to rpe', 'pct' as const, 'RPE'],
  ])(
    'fires onModeChange with correct mode when switching from %s',
    (_, initialMode, targetButtonLabel) => {
      const onModeChange = vi.fn();
      renderEffortInput({ mode: initialMode, onModeChange });
      const buttons = screen.getAllByRole('button');
      const targetButton = buttons.find((b) => b.textContent === targetButtonLabel);

      fireEvent.click(targetButton!);
      expect(onModeChange).toHaveBeenCalledWith(targetButtonLabel === '%' ? 'pct' : 'rpe');
    }
  );

  it('fires onModeChange when clicking the currently-active mode button', () => {
    const onModeChange = vi.fn();
    renderEffortInput({ mode: 'rpe', onModeChange });
    const buttons = screen.getAllByRole('button');
    const rpeButton = buttons.find((b) => b.textContent === 'RPE');

    fireEvent.click(rpeButton!);
    expect(onModeChange).toHaveBeenCalledWith('rpe');
  });

  it.each([
    ['in-range rpe', 'rpe' as const, '7', 7],
    ['in-range pct', 'pct' as const, '75', 75],
    ['above max rpe', 'rpe' as const, '15', 10],
    ['above max pct', 'pct' as const, '150', 100],
    ['below min rpe', 'rpe' as const, '0', 1],
    ['below min pct', 'pct' as const, '-5', 1],
    ['non-numeric', 'rpe' as const, 'abc', 1],
  ])('fires onValueChange with clamped value for %s', (_, mode, inputValue, expectedValue) => {
    const onValueChange = vi.fn();
    renderEffortInput({ mode, onValueChange });
    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(input, { target: { value: inputValue } });
    expect(onValueChange).toHaveBeenCalledWith(expectedValue);
  });

  it.each([
    ['rpe rounds down to nearest 0.5', 'rpe' as const, '7.2', 7],
    ['rpe rounds up to nearest 0.5', 'rpe' as const, '7.3', 7.5],
    ['rpe exact multiple of 0.5 unchanged', 'rpe' as const, '8.5', 8.5],
    ['pct rounds down to nearest integer', 'pct' as const, '75.2', 75],
    ['pct rounds up to nearest integer', 'pct' as const, '75.6', 76],
    ['snapping still respects the max clamp', 'rpe' as const, '9.8', 10],
  ])('snaps typed values to the nearest step for %s', (_, mode, inputValue, expectedValue) => {
    const onValueChange = vi.fn();
    renderEffortInput({ mode, onValueChange });
    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(input, { target: { value: inputValue } });
    expect(onValueChange).toHaveBeenCalledWith(expectedValue);
  });

  it('reflects the value prop in the rendered input', () => {
    const { rerender } = renderEffortInput({ value: 5 });
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('5');

    rerender(<EffortInput mode="rpe" value={8} onModeChange={vi.fn()} onValueChange={vi.fn()} />);
    expect(input.value).toBe('8');
  });

  it('handles empty input gracefully', () => {
    const onValueChange = vi.fn();
    renderEffortInput({ onValueChange });
    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    expect(onValueChange).toHaveBeenCalledWith(1);
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EffortInput } from './EffortInput';

afterEach(cleanup);

describe('EffortInput', () => {
  describe('rendering and mode prop', () => {
    it.each([
      ['rpe mode', 'rpe', 1, 10, 0.5],
      ['pct mode', 'pct', 1, 100, 1],
    ])(
      'renders with correct min/max/step for %s',
      (_, mode, expectedMin, expectedMax, expectedStep) => {
        render(
          <EffortInput
            mode={mode as 'rpe' | 'pct'}
            value={5}
            onModeChange={vi.fn()}
            onValueChange={vi.fn()}
          />
        );

        const input = screen.getByDisplayValue('5') as HTMLInputElement;
        expect(input.min).toBe(String(expectedMin));
        expect(input.max).toBe(String(expectedMax));
        expect(input.step).toBe(String(expectedStep));
      }
    );

    it.each([
      ['rpe', 'rpe'],
      ['pct', '%'],
    ])('renders both chip buttons with %s as active', (mode) => {
      const modeVal = mode as 'rpe' | 'pct';
      render(
        <EffortInput mode={modeVal} value={5} onModeChange={vi.fn()} onValueChange={vi.fn()} />
      );

      const rpeButton = screen.getByText('RPE');
      const pctButton = screen.getByText('%');

      if (mode === 'rpe') {
        expect(rpeButton.className).toContain('chipActive');
        expect(pctButton.className).not.toContain('chipActive');
      } else {
        expect(pctButton.className).toContain('chipActive');
        expect(rpeButton.className).not.toContain('chipActive');
      }
    });

    it('reflects value prop in rendered input', () => {
      const { rerender } = render(
        <EffortInput mode="rpe" value={7} onModeChange={vi.fn()} onValueChange={vi.fn()} />
      );

      expect(screen.getByDisplayValue('7')).toBeDefined();

      rerender(
        <EffortInput mode="rpe" value={9.5} onModeChange={vi.fn()} onValueChange={vi.fn()} />
      );

      expect(screen.getByDisplayValue('9.5')).toBeDefined();
    });
  });

  describe('mode change interactions', () => {
    it.each([
      ['from rpe to pct', 'rpe', 'pct'],
      ['from pct to rpe', 'pct', 'rpe'],
    ])('calls onModeChange with new mode %s', (_, initialMode, targetMode) => {
      const onModeChange = vi.fn();
      render(
        <EffortInput
          mode={initialMode as 'rpe' | 'pct'}
          value={5}
          onModeChange={onModeChange}
          onValueChange={vi.fn()}
        />
      );

      const targetButton = screen.getByText(targetMode === 'rpe' ? 'RPE' : '%');
      fireEvent.click(targetButton);

      expect(onModeChange).toHaveBeenCalledWith(targetMode);
    });
  });

  describe('value input interactions', () => {
    it.each([
      ['rpe mode, valid in-range', 'rpe', '5.5', 5.5],
      ['rpe mode, min boundary', 'rpe', '1', 1],
      ['rpe mode, max boundary', 'rpe', '10', 10],
      ['pct mode, valid in-range', 'pct', '50', 50],
      ['pct mode, min boundary', 'pct', '1', 1],
      ['pct mode, max boundary', 'pct', '100', 100],
      ['rpe mode, above max', 'rpe', '15', 10],
      ['rpe mode, below min', 'rpe', '0', 1],
      ['pct mode, above max', 'pct', '150', 100],
      ['pct mode, below min', 'pct', '0', 1],
      ['rpe mode, 5.25 snaps to 5.5', 'rpe', '5.25', 5.5],
      ['rpe mode, 5.1 snaps to 5', 'rpe', '5.1', 5],
      ['rpe mode, 5.7 snaps to 5.5', 'rpe', '5.7', 5.5],
      ['pct mode, 49.6 snaps to 50', 'pct', '49.6', 50],
      ['pct mode, 49.4 snaps to 49', 'pct', '49.4', 49],
    ])('%s', (_, mode, inputValue, expectedValue) => {
      const onValueChange = vi.fn();
      render(
        <EffortInput
          mode={mode as 'rpe' | 'pct'}
          value={5}
          onModeChange={vi.fn()}
          onValueChange={onValueChange}
        />
      );

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: inputValue } });

      expect(onValueChange).toHaveBeenCalledWith(expectedValue);
    });

    it('handles empty input by resetting to min (1)', () => {
      const onValueChange = vi.fn();
      render(
        <EffortInput mode="rpe" value={5} onModeChange={vi.fn()} onValueChange={onValueChange} />
      );

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });

      expect(onValueChange).toHaveBeenCalledWith(1);
    });

    it('handles non-numeric input by resetting to min (1)', () => {
      const onValueChange = vi.fn();
      render(
        <EffortInput mode="rpe" value={5} onModeChange={vi.fn()} onValueChange={onValueChange} />
      );

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(onValueChange).toHaveBeenCalledWith(1);
    });
  });

  describe('mode switching with input values', () => {
    it('updates min/max/step when mode changes from rpe to pct', () => {
      const { rerender } = render(
        <EffortInput mode="rpe" value={7} onModeChange={vi.fn()} onValueChange={vi.fn()} />
      );

      let input = screen.getByDisplayValue('7') as HTMLInputElement;
      expect(input.max).toBe('10');
      expect(input.step).toBe('0.5');

      rerender(
        <EffortInput mode="pct" value={70} onModeChange={vi.fn()} onValueChange={vi.fn()} />
      );

      input = screen.getByDisplayValue('70') as HTMLInputElement;
      expect(input.max).toBe('100');
      expect(input.step).toBe('1');
    });

    it('updates min/max/step when mode changes from pct to rpe', () => {
      const { rerender } = render(
        <EffortInput mode="pct" value={70} onModeChange={vi.fn()} onValueChange={vi.fn()} />
      );

      let input = screen.getByDisplayValue('70') as HTMLInputElement;
      expect(input.max).toBe('100');
      expect(input.step).toBe('1');

      rerender(<EffortInput mode="rpe" value={7} onModeChange={vi.fn()} onValueChange={vi.fn()} />);

      input = screen.getByDisplayValue('7') as HTMLInputElement;
      expect(input.max).toBe('10');
      expect(input.step).toBe('0.5');
    });
  });
});

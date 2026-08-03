import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EffortPopover } from './EffortPopover';

afterEach(cleanup);

describe('EffortPopover', () => {
  beforeEach(() => {
    // Setup ResizeObserver mock to suppress Radix popover warnings in test env
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe('rendering and initial state', () => {
    it('renders the reps input with the given value', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('8') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.min).toBe('1');
      expect(input.max).toBe('20');
    });

    it('exposes a touch- and screen-reader-friendly effort hint', () => {
      render(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('5');
      expect(input.getAttribute('aria-label')).toBe('Reps: 5. Activate to set RPE or percentage');
      expect(input.getAttribute('title')).toBeNull();
    });
  });

  describe('reps input interaction', () => {
    it.each([
      ['valid in-range', '10', 10],
      ['min boundary', '1', 1],
      ['max boundary', '20', 20],
      ['below min', '0', 1],
      ['above max', '25', 25],
      ['NaN', 'abc', 1],
    ])('handles reps input change for %s', (_, inputValue, expectedCallValue) => {
      const onRepsChange = vi.fn();
      render(
        <EffortPopover
          reps={5}
          onRepsChange={onRepsChange}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('5') as HTMLInputElement;
      fireEvent.change(input, { target: { value: inputValue } });

      expect(onRepsChange).toHaveBeenCalledWith(expectedCallValue);
    });
  });

  describe('popover open/close via click', () => {
    it('opens popover on click of reps input', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('8');

      // Before click, EffortInput should not be present
      expect(screen.queryByText('RPE')).toBeNull();

      // Click to open popover
      fireEvent.click(input);

      // After click, EffortInput should be present (RPE/% buttons)
      expect(screen.getByText('RPE')).toBeDefined();
      expect(screen.getByText('%')).toBeDefined();
    });

    it('closes popover on Escape key', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('8');

      // Open popover
      fireEvent.click(input);
      expect(screen.getByText('RPE')).toBeDefined();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Popover should be closed (EffortInput not rendered)
      expect(screen.queryByText('RPE')).toBeNull();
    });

    it('reopens on click after being closed via Escape, and again after that', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('8');

      // Open, close, reopen, close, reopen — regression test for a bug where the
      // popover would only ever open the very first time it was clicked.
      for (let i = 0; i < 3; i++) {
        fireEvent.click(input);
        expect(screen.getByText('RPE')).toBeDefined();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByText('RPE')).toBeNull();
      }
    });

    it('closes on an outside click and reopens on a subsequent click, repeatedly', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('8');

      // Regression test for a bug where the popover would only ever open the first time:
      // closing via a genuine outside click (not Escape) must not leave it unable to reopen.
      for (let i = 0; i < 3; i++) {
        fireEvent.click(input);
        expect(screen.getByText('RPE')).toBeDefined();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('RPE')).toBeNull();
      }
    });

    it('does not close when the reps input (the popover anchor) receives a mousedown while already open', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('8');
      fireEvent.click(input);
      expect(screen.getByText('RPE')).toBeDefined();

      // Simulate the first mousedown of a subsequent click landing back on the
      // anchor input while the popover is already open — this must not be treated as an
      // "outside click" that closes the popover out from under the user.
      fireEvent.mouseDown(input);
      expect(screen.getByText('RPE')).toBeDefined();
    });

    it('does not close when clicking inside the open popover content', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('8');
      fireEvent.click(input);
      const rpeButton = screen.getByText('RPE');

      fireEvent.mouseDown(rpeButton);
      expect(screen.getByText('RPE')).toBeDefined();
    });
  });

  describe('effort indicator badge', () => {
    it.each([
      ['rpe mode, default value (10)', 'rpe', 10, 'hidden'],
      ['rpe mode, non-default value (8)', 'rpe', 8, 'visible'],
      ['rpe mode, min value (1)', 'rpe', 1, 'visible'],
      ['pct mode, default value (100)', 'pct', 100, 'hidden'],
      ['pct mode, non-default value (85)', 'pct', 85, 'visible'],
      ['pct mode, min value (1)', 'pct', 1, 'visible'],
    ])('shows correct visibility for %s', (_, mode, value, expectedVisibility) => {
      render(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode={mode as 'rpe' | 'pct'}
          effortValue={value}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const badge = screen.getByText(mode === 'rpe' ? `RPE${value}` : `${value}%`);
      expect(badge.style.visibility).toBe(expectedVisibility);
    });

    it('displays correct badge text for RPE mode', () => {
      render(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={8.5}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      expect(screen.getByText('RPE8.5')).toBeDefined();
    });

    it('displays correct badge text for pct mode', () => {
      render(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode="pct"
          effortValue={85}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      expect(screen.getByText('85%')).toBeDefined();
    });

    it('always has badge in DOM (just visibility toggle)', () => {
      const { rerender } = render(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={10}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      // When default, badge should be hidden
      let badge = screen.getByText('RPE10');
      expect(badge.style.visibility).toBe('hidden');

      // Change to non-default, rerender
      rerender(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={8}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      // Badge text changes and becomes visible (same DOM element, no reflow)
      badge = screen.getByText('RPE8');
      expect(badge.style.visibility).toBe('visible');
    });
  });

  describe('EffortInput interaction through popover', () => {
    it('passes effort changes to callbacks when popover is open', () => {
      const onModeChange = vi.fn();
      const onValueChange = vi.fn();
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={9}
          onEffortModeChange={onModeChange}
          onEffortValueChange={onValueChange}
        />
      );

      const input = screen.getByDisplayValue('8');
      fireEvent.click(input);

      // EffortInput should be open, switch mode
      const pctButton = screen.getByText('%');
      fireEvent.click(pctButton);

      expect(onModeChange).toHaveBeenCalledWith('pct');
    });

    it('renders EffortInput with correct initial props when opened', () => {
      render(
        <EffortPopover
          reps={8}
          onRepsChange={vi.fn()}
          effortMode="pct"
          effortValue={85}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const repsInput = screen.getByDisplayValue('8');
      fireEvent.click(repsInput);

      // Check that the % button is active (pct mode)
      const pctButton = screen.getByText('%');
      expect(pctButton.className).toContain('chipActive');

      // Check that the value input shows 85
      const valueInput = screen.getByDisplayValue('85') as HTMLInputElement;
      expect(valueInput.max).toBe('100');
      expect(valueInput.step).toBe('1');
    });
  });

  describe('layout and structure', () => {
    it('renders input and badge side-by-side', () => {
      render(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={8}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const input = screen.getByDisplayValue('5');
      const badge = screen.getByText('RPE8');

      // Both should be present in the document
      expect(input).toBeDefined();
      expect(badge).toBeDefined();
    });

    it('badge is marked as aria-hidden to avoid screen reader duplication', () => {
      render(
        <EffortPopover
          reps={5}
          onRepsChange={vi.fn()}
          effortMode="rpe"
          effortValue={8}
          onEffortModeChange={vi.fn()}
          onEffortValueChange={vi.fn()}
        />
      );

      const badge = screen.getByText('RPE8');
      expect(badge.getAttribute('aria-hidden')).toBe('true');
    });
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartLegend } from './ChartLegend';

afterEach(cleanup);

const items = [
  { key: 'squat', label: 'Squat', color: 'red' },
  { key: 'bench', label: 'Bench', color: 'blue', dash: 'short' as const },
];

describe('ChartLegend', () => {
  it('renders informational items when no interaction is provided', () => {
    render(<ChartLegend items={items} />);

    expect(screen.getByLabelText('Chart series').textContent).toContain('Squat');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('communicates series state and toggles from keyboard-operable buttons', () => {
    const onToggle = vi.fn();
    render(<ChartLegend items={items} hiddenKeys={new Set(['bench'])} onToggle={onToggle} />);

    expect(
      screen.getByRole('button', { name: 'Squat series, visible' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: 'Bench series, hidden' }).getAttribute('aria-pressed')
    ).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Bench series, hidden' }));
    expect(onToggle).toHaveBeenCalledWith('bench');
  });
});

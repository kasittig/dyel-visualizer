import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FirstUseGuide } from './FirstUseGuide';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FirstUseGuide', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    });
  });

  it('explains the three unfamiliar concepts on first use', () => {
    render(<FirstUseGuide />);

    const guide = screen.getByRole('region', { name: 'Reading your training data' });
    expect(within(guide).getByText('e1RM')).toBeDefined();
    expect(within(guide).getByText('Normalization')).toBeDefined();
    expect(within(guide).getByText('Overview')).toBeDefined();
  });

  it('persists dismissal and remains reachable from the metric guide control', () => {
    const { unmount } = render(<FirstUseGuide />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss metric guide' }));
    expect(screen.queryByRole('region')).toBeNull();
    expect(localStorage.getItem('dyel:metricGuideDismissed')).toBe('true');

    unmount();
    render(<FirstUseGuide />);
    const toggle = screen.getByRole('button', { name: 'Metric guide' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    expect(screen.getByRole('region', { name: 'Reading your training data' })).toBeDefined();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DateRangePicker } from './DateRangePicker';

afterEach(cleanup);

describe('DateRangePicker', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(max-width: 640px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  const useDesktopLayout = () =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

  it('exposes the current preset through the compact mobile control', () => {
    const latest = new Date(2026, 6, 20);

    render(
      <DateRangePicker
        value={{ from: new Date(2026, 6, 6), to: latest }}
        onChange={vi.fn()}
        sessionDates={[latest]}
      />
    );

    expect(screen.getByRole('button', { name: 'Date range: 2 weeks' })).toBeDefined();
  });

  it('shows the global date scope beside the compact mobile control', () => {
    render(
      <DateRangePicker
        value={{}}
        onChange={vi.fn()}
        scopeLabel="Applies to all visualization tabs"
      />
    );

    expect(screen.getByRole('group', { name: 'Date range' })).toBeDefined();
    expect(screen.getByText('Applies to all visualization tabs')).toBeDefined();
  });

  it('selects a preset from the compact date-range panel', () => {
    const latest = new Date(2026, 6, 20);
    const onChange = vi.fn();

    render(
      <DateRangePicker
        value={{ from: undefined, to: latest }}
        onChange={onChange}
        sessionDates={[latest]}
      />
    );

    fireEvent.click(screen.getByLabelText('Date range: All time'));
    const panel = screen.getByLabelText('Choose date range');
    fireEvent.click(within(panel).getByRole('button', { name: '1 month' }));

    expect(onChange).toHaveBeenCalledWith({
      from: new Date(2026, 5, 20),
      to: latest,
    });
  });

  it('keeps the panel open while using the custom calendar', () => {
    const latest = new Date(2026, 6, 20);

    render(
      <DateRangePicker
        value={{ from: undefined, to: latest }}
        onChange={vi.fn()}
        sessionDates={[latest]}
      />
    );

    fireEvent.click(screen.getByLabelText('Date range: All time'));
    fireEvent.click(within(screen.getByLabelText('Choose date range')).getByText('Custom'));
    const panel = screen.getByLabelText('Choose date range');
    fireEvent.mouseDown(within(panel).getByRole('grid'));

    expect(screen.getByLabelText('Choose date range')).toBeDefined();
  });

  it('keeps the desktop date presets in one compact control group', () => {
    useDesktopLayout();
    const latest = new Date(2026, 6, 20);

    render(
      <DateRangePicker
        value={{ from: new Date(2026, 6, 6), to: latest }}
        onChange={vi.fn()}
        sessionDates={[latest]}
      />
    );

    const presets = screen.getByLabelText('Date range presets');
    expect(within(presets).getByRole('button', { name: '2 weeks' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(within(presets).getByRole('button', { name: 'Custom' })).toBeDefined();
  });

  it('opens custom date inputs from the compact desktop Custom control', () => {
    useDesktopLayout();
    const latest = new Date(2026, 6, 20);

    render(
      <DateRangePicker
        value={{ from: new Date(2026, 6, 6), to: latest }}
        onChange={vi.fn()}
        sessionDates={[latest]}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Custom' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(document.activeElement).toBe(trigger);
    expect(screen.getByLabelText('Start date')).toBeDefined();
    expect(screen.getByLabelText('End date')).toBeDefined();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});

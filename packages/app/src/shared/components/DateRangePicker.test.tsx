import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DateRangePicker } from './DateRangePicker';

afterEach(cleanup);

describe('DateRangePicker', () => {
  beforeEach(() => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it('exposes the current preset through the compact mobile control', () => {
    const latest = new Date(2026, 6, 20);

    render(
      <DateRangePicker
        value={{ from: new Date(2026, 6, 6), to: latest }}
        onChange={vi.fn()}
        sessionDates={[latest]}
      />
    );

    expect(screen.getByRole('button', { name: 'Date range: 2 WKS' })).toBeDefined();
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

    fireEvent.click(screen.getByLabelText('Date range: ALL TIME'));
    const panel = screen.getByLabelText('Choose date range');
    fireEvent.click(within(panel).getByRole('button', { name: '1 MO' }));

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

    fireEvent.click(screen.getByLabelText('Date range: ALL TIME'));
    fireEvent.click(within(screen.getByLabelText('Choose date range')).getByText('CUSTOM'));
    const panel = screen.getByLabelText('Choose date range');
    fireEvent.mouseDown(within(panel).getByRole('grid'));

    expect(screen.getByLabelText('Choose date range')).toBeDefined();
  });
});

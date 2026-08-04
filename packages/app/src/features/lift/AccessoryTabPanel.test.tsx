import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessoryTabPanel } from './AccessoryTabPanel';
import { useAccessoryTable } from './useAccessoryTable';

vi.mock('./useAccessoryTable');
vi.mock('../../shared/components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/components')>();
  return {
    ...actual,
    EditableDateChip: () => <span>Date range</span>,
  };
});

const mockUseAccessoryTable = vi.mocked(useAccessoryTable);
const dateRange = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) };

describe('AccessoryTabPanel', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    mockUseAccessoryTable.mockReturnValue([
      {
        subtype: 'upper',
        label: 'Upper',
        rows: [
          {
            label: 'Chest-supported row',
            effects: [],
            effectsDisplay: '—',
            lastSession: { date: new Date(2026, 0, 30), sets: [] },
            lastPerformedDisplay: 'Jan 30',
            sessionCount: 4,
            sessionCountInRange: 2,
            subtype: 'upper',
          },
        ],
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the inventory first and excludes main-lift-only UI', () => {
    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    expect(screen.getByRole('heading', { name: 'Accessory work' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Accessory inventory' })).toBeTruthy();
    expect(screen.getByText(/Review what you are training/)).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Exercise' })).toBeTruthy();
    expect(screen.getByText(/Only one accessory appears in this range/)).toBeTruthy();
    expect(screen.queryByText('Diagnostics')).toBeNull();
    expect(screen.queryByText(/e1RM history by variation/)).toBeNull();
  });

  it('keeps the selected accessory available for detail views', () => {
    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    fireEvent.click(screen.getByRole('cell', { name: 'Chest-supported row' }));
    expect(screen.getByRole('status').textContent).toContain('Selected: Chest-supported row');
  });

  it('explains how to recover from an empty training period', () => {
    mockUseAccessoryTable.mockReturnValue([]);
    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    expect(screen.getByText(/Adjust the date range or log an accessory exercise/)).toBeTruthy();
  });

  it('keeps all-time inventory visible while explaining an empty date range', () => {
    mockUseAccessoryTable.mockReturnValue([
      {
        subtype: 'upper',
        label: 'Upper',
        rows: [
          {
            label: 'Chest-supported row',
            effects: [],
            effectsDisplay: '—',
            lastSession: { date: new Date(2026, 0, 30), sets: [] },
            lastPerformedDisplay: 'Jan 30',
            sessionCount: 4,
            sessionCountInRange: 0,
            subtype: 'upper',
          },
        ],
      },
    ]);
    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    expect(screen.getByText(/No accessory work was logged in this training period/)).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Chest-supported row' })).toBeTruthy();
  });

  it('clears an accessory selection across date range changes, including a prior range', () => {
    const view = render(
      <AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />
    );
    fireEvent.click(screen.getByRole('cell', { name: 'Chest-supported row' }));
    expect(screen.getByRole('status')).toBeTruthy();

    view.rerender(
      <AccessoryTabPanel
        dateRange={{ from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) }}
        onDateRangeChange={vi.fn()}
        unit="lbs"
      />
    );
    expect(screen.queryByRole('status')).toBeNull();

    view.rerender(
      <AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />
    );
    expect(screen.queryByRole('status')).toBeNull();
  });
});

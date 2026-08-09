import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessoryTabPanel } from './AccessoryTabPanel';
import { useAccessoryTable } from './useAccessoryTable';
import { useAccessoryCoverage } from './useAccessoryCoverage';
import { useWeaknessAccessoryCoverage } from './useWeaknessAccessoryCoverage';
import { useCategoryEffectivenessEvidence } from './useCategoryEffectivenessEvidence';

vi.mock('./useAccessoryTable');
vi.mock('./useAccessoryCoverage');
vi.mock('./useWeaknessAccessoryCoverage');
vi.mock('./useCategoryEffectivenessEvidence');
vi.mock('./AccessoryHistoryChart', () => ({
  AccessoryHistoryChart: ({ exerciseLabel }: { exerciseLabel: string }) => (
    <div role="status">Selected: {exerciseLabel}</div>
  ),
}));
vi.mock('../../shared/components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/components')>();
  return {
    ...actual,
    EditableDateChip: () => <span>Date range</span>,
  };
});

const mockUseAccessoryTable = vi.mocked(useAccessoryTable);
const mockUseAccessoryCoverage = vi.mocked(useAccessoryCoverage);
const mockUseWeaknessAccessoryCoverage = vi.mocked(useWeaknessAccessoryCoverage);
const mockUseCategoryEffectivenessEvidence = vi.mocked(useCategoryEffectivenessEvidence);
const dateRange = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) };
const expandCategory = (label: string) => {
  const toggle = screen
    .getAllByRole('button', { name: new RegExp(label, 'i') })
    .find((button) => button.hasAttribute('aria-expanded'))!;
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
};

describe('AccessoryTabPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }))
    );
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    mockUseAccessoryCoverage.mockReturnValue([
      { category: 'upper-pull', sessionCount: 2, volume: 1_000 },
    ]);
    mockUseWeaknessAccessoryCoverage.mockReturnValue([]);
    mockUseCategoryEffectivenessEvidence.mockReturnValue({
      windowPolicy: 'Selected range split into two periods.',
      unavailableReason: 'No related history is available.',
      rows: [],
    });
    mockUseAccessoryTable.mockReturnValue([
      {
        category: 'upper-pull',
        label: 'Upper pull',
        rows: [
          {
            id: 'canonical:chest-supported-row',
            label: 'Chest-supported row',
            effects: [],
            lastSession: { date: '2026-01-30', sets: 1, reps: 10, weight: 50, rpe: null },
            lastPerformedDisplay: 'Jan 30',
            progress: {
              scope: 'all-time',
              status: 'flat',
              latest: { date: '2026-01-30', sets: 1, reps: 10, weight: 50, rpe: null },
              previous: null,
              best: null,
              daysSinceLastPerformed: 1,
              change: null,
            },
            progressDisplay: 'Flat',
            progressDetailDisplay: 'first session',
            sessionCount: 4,
            sessionCountInRange: 2,
            subtype: 'upper',
            category: 'upper-pull',
            classification: { category: 'upper-pull', source: 'heuristic', confidence: 'high' },
            classificationDisplay: 'Name match · high confidence',
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

    expect(screen.getByRole('heading', { name: 'Accessory inventory' })).toBeTruthy();
    expect(screen.queryByText(/Review what you are training/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'About accessory inventory' }));
    expect(screen.getByText(/Review what you are training/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Coverage in range' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Weakness coverage' })).toBeTruthy();
    expect(screen.getByText('How to read these associations')).toBeTruthy();
    expect(screen.getByText('No related history is available.')).toBeTruthy();
    expect(screen.getByText('2 sessions')).toBeTruthy();
    const categoryToggle = screen.getByRole('button', { name: /Upper pull.*1 exercise/i });
    const coverageCategory = screen.getByRole('button', { name: 'Upper pull' });
    fireEvent.click(coverageCategory);
    expect(categoryToggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(categoryToggle);
    expect(screen.getByRole('columnheader', { name: 'Exercise' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Progress (all time)' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: /Flat.*first session/ })).toBeTruthy();
    expect(screen.getByText(/Only one accessory appears in this range/)).toBeTruthy();
    expect(screen.queryByText('Diagnostics')).toBeNull();
    expect(screen.queryByText(/e1RM history by variation/)).toBeNull();
  });

  it('marks categories associated with a current weakness without recommending them', () => {
    mockUseWeaknessAccessoryCoverage.mockReturnValue([
      {
        effect: 'UPPER_BACK',
        effectLabel: 'Upper Back',
        evidenceSummary: '1 below-range signal · 0 above-range signals',
        rationale: 'Reviewed association.',
        status: 'mapped',
        categories: [
          {
            category: 'upper-pull',
            label: 'Upper pull',
            recentExposure: [],
            contributingExercises: ['Chest-supported row'],
          },
        ],
      },
    ]);

    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    expect(screen.getByText('Mapped signal')).toBeTruthy();
    expect(screen.getByText(/not a training recommendation/)).toBeTruthy();
    expect(screen.queryByText('Recommended')).toBeNull();
  });

  it('selects the first in-range accessory initially and synchronizes table clicks', () => {
    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    expect(screen.getByRole('status').textContent).toContain('Selected: Chest-supported row');
    expandCategory('Upper pull');
    fireEvent.click(screen.getByRole('cell', { name: 'Chest-supported row' }));
    expect(screen.getByRole('status').textContent).toContain('Selected: Chest-supported row');
  });

  it.each(['Enter', ' '])('selects another accessory with the %s key', (key) => {
    const groups = mockUseAccessoryTable('lbs', dateRange);
    const firstRow = groups[0]!.rows[0]!;
    mockUseAccessoryTable.mockReturnValue([
      {
        ...groups[0]!,
        rows: [
          firstRow,
          {
            ...firstRow,
            id: 'canonical:db-curl',
            label: 'DB curl',
          },
        ],
      },
    ]);
    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    expandCategory('Upper pull');
    const button = screen.getByRole('button', { name: 'DB curl' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.focus();
    fireEvent.keyDown(button, { key });

    expect(screen.getByRole('status').textContent).toContain('Selected: DB curl');
    expect(button.getAttribute('aria-pressed')).toBe('true');
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
            id: 'canonical:chest-supported-row',
            label: 'Chest-supported row',
            effects: [],
            lastSession: { date: '2026-01-30', sets: 1, reps: 10, weight: 50, rpe: null },
            lastPerformedDisplay: 'Jan 30',
            progress: {
              scope: 'all-time',
              status: 'flat',
              latest: { date: '2026-01-30', sets: 1, reps: 10, weight: 50, rpe: null },
              previous: null,
              best: null,
              daysSinceLastPerformed: 1,
              change: null,
            },
            progressDisplay: 'Flat',
            progressDetailDisplay: 'first session',
            sessionCount: 4,
            sessionCountInRange: 0,
            subtype: 'upper',
          },
        ],
      },
    ]);
    render(<AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />);

    expect(screen.getByText(/No accessory work was logged in this training period/)).toBeTruthy();
    expandCategory('Upper');
    expect(screen.getByRole('cell', { name: 'Chest-supported row' })).toBeTruthy();
  });

  it('clears an accessory selection across date range changes, including a prior range', () => {
    const view = render(
      <AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />
    );
    expandCategory('Upper pull');
    fireEvent.click(screen.getByRole('cell', { name: 'Chest-supported row' }));
    expect(screen.getByRole('status')).toBeTruthy();

    view.rerender(
      <AccessoryTabPanel
        dateRange={{ from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) }}
        onDateRangeChange={vi.fn()}
        unit="lbs"
      />
    );
    expect(screen.getByRole('status').textContent).toContain('Selected: Chest-supported row');

    view.rerender(
      <AccessoryTabPanel dateRange={dateRange} onDateRangeChange={vi.fn()} unit="lbs" />
    );
    expect(screen.getByRole('status').textContent).toContain('Selected: Chest-supported row');
  });
});

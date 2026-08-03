import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TeamSummaryPage } from './TeamSummaryPage';
import type { TeamSummaryRow } from './useTeamSummaryData';

type SummaryData = ReturnType<typeof useTeamSummaryData>;

vi.mock('../team-view', () => ({ useTeamViewData: vi.fn() }));
vi.mock('./useTeamSummaryData', () => ({ useTeamSummaryData: vi.fn() }));

const { useTeamViewData } = await import('../team-view');
const { useTeamSummaryData } = await import('./useTeamSummaryData');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mockRow = (overrides?: Partial<TeamSummaryRow>): TeamSummaryRow => ({
  lifterName: overrides?.lifterName ?? 'John Doe',
  url:
    overrides?.url ??
    `https://example.com/${encodeURIComponent(overrides?.lifterName ?? 'John Doe')}`,
  hasData: true,
  squatDisplay: '300 lbs',
  benchDisplay: '225 lbs',
  deadliftDisplay: '400 lbs',
  totalDisplay: '925 lbs',
  squat: 300,
  bench: 225,
  deadlift: 400,
  total: 925,
  sessionCount: 4,
  lastSetDisplay: '3x5 @ 225 lbs',
  dateDisplay: '1/1',
  ...overrides,
});

const mockSummaryData = (overrides?: Partial<SummaryData>): SummaryData => ({
  rows: [],
  erroredLifterCount: 0,
  unit: 'lbs',
  setUnit: vi.fn(),
  toggleUnit: vi.fn(),
  dateRange: { from: undefined, to: undefined },
  setDateRange: vi.fn(),
  ...overrides,
});

const useMobileViewport = () =>
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

describe('TeamSummaryPage', () => {
  beforeEach(() => {
    vi.mocked(useTeamSummaryData).mockReturnValue(mockSummaryData());
  });

  it('renders loading state', () => {
    vi.mocked(useTeamViewData).mockReturnValue({ status: 'loading' });
    render(<TeamSummaryPage />);
    expect(screen.getByText(/loading lifters/i)).toBeDefined();
  });

  it('renders error state with message', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'error',
      message: 'Failed to fetch sheets',
    });
    render(<TeamSummaryPage />);
    expect(screen.getByText('Failed to fetch sheets')).toBeDefined();
  });

  it.each([
    ['with no rows', [], false],
    ['with rows', [mockRow({ lifterName: 'Alice' }), mockRow({ lifterName: 'Bob' })], false],
    ['with errored lifters', [mockRow({ lifterName: 'Charlie' })], true],
  ] as Array<[string, TeamSummaryRow[], boolean]>)(
    'renders success state %s',
    (_, rows, hasErrors) => {
      vi.mocked(useTeamViewData).mockReturnValue({
        status: 'success',
        data: [],
      });
      vi.mocked(useTeamSummaryData).mockReturnValue(
        mockSummaryData({
          rows,
          erroredLifterCount: hasErrors ? 2 : 0,
        })
      );
      render(<TeamSummaryPage />);

      expect(screen.getByRole('button', { name: 'lbs' })).toBeDefined();

      if (rows.length === 0) {
        expect(screen.getByText('No lifters available')).toBeDefined();
      } else {
        expect(screen.getByRole('table')).toBeDefined();
        expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
        expect(screen.getByText('Squat')).toBeDefined();
        expect(screen.getByText('Bench')).toBeDefined();
        expect(screen.getByText('Deadlift')).toBeDefined();
        expect(screen.getByText('Total')).toBeDefined();
        expect(screen.getByText('Sessions')).toBeDefined();
        rows.forEach((r) => expect(screen.getByText(r.lifterName)).toBeDefined());
      }
      if (hasErrors) {
        expect(screen.getByText(/\d+ lifters could not be loaded/)).toBeDefined();
      }
    }
  );

  it.each([
    [1, '1 lifter could not be loaded'],
    [3, '3 lifters could not be loaded'],
  ] as Array<[number, string]>)(
    'displays correct wording when erroredLifterCount is %i',
    (count, text) => {
      vi.mocked(useTeamViewData).mockReturnValue({
        status: 'success',
        data: [],
      });
      vi.mocked(useTeamSummaryData).mockReturnValue(
        mockSummaryData({
          rows: [mockRow()],
          erroredLifterCount: count,
        })
      );
      render(<TeamSummaryPage />);
      expect(screen.getByText(text)).toBeDefined();
    }
  );

  it('renders a link icon next to the lifter name linking to their sheet', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [mockRow({ lifterName: 'Alice', url: 'https://example.com/alice-sheet' })],
      })
    );
    render(<TeamSummaryPage />);

    const link = screen.getByTitle('Open Alice in DYEL Visualizer');
    expect(link.getAttribute('href')).toBe(
      `/?sheet=${encodeURIComponent('https://example.com/alice-sheet')}`
    );
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('back link resolves against the site root, not the current two-segment path', () => {
    window.history.pushState({}, '', '/dyel-visualizer/team/summary');
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    render(<TeamSummaryPage />);

    expect(screen.getByText('← Back to DYEL Visualizer').getAttribute('href')).toBe(
      '/dyel-visualizer/'
    );

    window.history.pushState({}, '', '/');
  });

  it('renders placeholder rows for lifters with no data', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [
          mockRow({ lifterName: 'Alice' }),
          mockRow({
            lifterName: 'Dana',
            squatDisplay: '—',
            benchDisplay: '—',
            deadliftDisplay: '—',
            totalDisplay: '—',
            squat: null,
            bench: null,
            deadlift: null,
            total: null,
            dateDisplay: '—',
            lastSetDisplay: 'No data logged',
            hasData: false,
          }),
        ],
      })
    );
    render(<TeamSummaryPage />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Dana')).toBeDefined();
    expect(screen.getByText('No data logged')).toBeDefined();
  });

  it('renders all column headers', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [mockRow()],
      })
    );
    render(<TeamSummaryPage />);

    expect(screen.getByText('Lifter')).toBeDefined();
    expect(screen.getByText('Squat')).toBeDefined();
    expect(screen.getByText('Bench')).toBeDefined();
    expect(screen.getByText('Deadlift')).toBeDefined();
    expect(screen.getByText('Total')).toBeDefined();
    expect(screen.getByText('Sessions')).toBeDefined();
    expect(screen.getByText('Last set')).toBeDefined();
    expect(screen.getByText('Date')).toBeDefined();
  });

  it('renders unit toggle buttons', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    vi.mocked(useTeamSummaryData).mockReturnValue(mockSummaryData());
    render(<TeamSummaryPage />);

    expect(screen.getByRole('button', { name: 'lbs' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'kg' })).toBeDefined();
  });

  it('wires unit toggle to setUnit', () => {
    const setUnit = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        unit: 'lbs',
        setUnit,
      })
    );
    render(<TeamSummaryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'kg' }));
    expect(setUnit).toHaveBeenCalledWith('kg');
  });

  it('renders EditableDateChip when date range is set', () => {
    const setDateRange = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    const from = new Date('2024-01-01');
    const to = new Date('2024-12-31');
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [mockRow()],
        dateRange: { from, to },
        setDateRange,
      })
    );
    render(<TeamSummaryPage />);

    // EditableDateChip renders with the class "tab-title-date"
    const dateChip = document.querySelector('.tab-title-date');
    expect(dateChip).toBeDefined();
  });

  it('sorts rows by clicking column headers', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [],
    });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [
          mockRow({ lifterName: 'Alice', squat: 300 }),
          mockRow({ lifterName: 'Zoe', squat: 250 }),
        ],
      })
    );
    render(<TeamSummaryPage />);

    const rows = screen.getAllByRole('row');
    // Default sort by Lifter name (ascending)
    expect(rows[1].textContent).toContain('Alice');
    expect(rows[2].textContent).toContain('Zoe');

    // Click Squat header to sort by squat
    fireEvent.click(screen.getByText('Squat'));
    const sortedRows = screen.getAllByRole('row');
    expect(sortedRows[1].textContent).toContain('Zoe');
    expect(sortedRows[2].textContent).toContain('Alice');
  });

  it('expands one mobile summary card at a time', () => {
    useMobileViewport();
    vi.mocked(useTeamViewData).mockReturnValue({ status: 'success', data: [] });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [
          mockRow({ lifterName: 'Alice', lastSetDisplay: 'Alice last set' }),
          mockRow({ lifterName: 'Bob', lastSetDisplay: 'Bob last set' }),
        ],
      })
    );
    render(<TeamSummaryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Show details for Alice' }));
    expect(screen.getByText('Alice last set')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Hide details for Alice' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Show details for Bob' }));
    expect(screen.queryByText('Alice last set')).toBeNull();
    expect(screen.getByText('Bob last set')).toBeDefined();
  });

  it('sorts the mobile cards from the compact sort control', () => {
    useMobileViewport();
    vi.mocked(useTeamViewData).mockReturnValue({ status: 'success', data: [] });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [
          mockRow({ lifterName: 'Alice', total: 900 }),
          mockRow({ lifterName: 'Bob', total: 800 }),
        ],
      })
    );
    render(<TeamSummaryPage />);

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'Total' } });
    expect(
      screen.getByLabelText('Team summary cards').querySelector('article:first-child')?.textContent
    ).toContain('Bob');
  });

  it('keeps duplicate lifter names independently identified by source URL', () => {
    useMobileViewport();
    vi.mocked(useTeamViewData).mockReturnValue({ status: 'success', data: [] });
    vi.mocked(useTeamSummaryData).mockReturnValue(
      mockSummaryData({
        rows: [
          mockRow({ lifterName: 'Alex', url: 'https://example.com/alex-a' }),
          mockRow({ lifterName: 'Alex', url: 'https://example.com/alex-b' }),
        ],
      })
    );

    render(<TeamSummaryPage />);

    const toggles = screen.getAllByRole('button', { name: 'Show details for Alex' });
    expect(toggles).toHaveLength(2);
    expect(toggles[0].getAttribute('aria-controls')).not.toBe(
      toggles[1].getAttribute('aria-controls')
    );
  });
});

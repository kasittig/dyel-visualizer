import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PipelineModel, AthleteContext } from '@dyel/api';
import type { LifterPipelineResult } from '@dyel/api';
import { CoachViewPage } from './CoachViewPage';
import type { CoachViewRow, useCoachViewSelection } from './useCoachViewSelection';

// Mock the hooks
vi.mock('./useCoachViewData', () => ({
  useCoachViewData: vi.fn(),
}));

vi.mock('./useCoachViewSelection', () => ({
  useCoachViewSelection: vi.fn(),
}));

const { useCoachViewData } = await import('./useCoachViewData');
const { useCoachViewSelection } = await import('./useCoachViewSelection');

afterEach(cleanup);

// Factory helpers for mock data
const mockAthlete: AthleteContext = { sex: 'M', bodyweight: 90, deadliftStance: 'sumo' };

const mockPipelineModel = (overrides?: Partial<PipelineModel>): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
  diagnostics: { byCanonical: new Map(), allFindings: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  tagged: [],
  pointsByDeriver: new Map([
    [
      'e1rm',
      [
        { t: Date.now(), v: 100, series: 'bench-classic', tags: new Set() },
        { t: Date.now(), v: 150, series: 'squat-classic', tags: new Set() },
      ],
    ],
  ]),
  pointsByLabelByDeriver: new Map(),
  pointsByDeriverAdjusted: new Map(),
  athlete: mockAthlete,
  ...overrides,
});

const mockLifterResult = (
  name: string,
  status: 'success' | 'error' = 'success'
): LifterPipelineResult => {
  if (status === 'error') {
    return {
      status: 'error',
      name,
      url: `https://example.com/${name}`,
      message: 'Failed to load',
    };
  }
  return {
    status: 'success',
    name,
    url: `https://example.com/${name}`,
    model: mockPipelineModel(),
  };
};

const mockRow = (overrides?: Partial<CoachViewRow>): CoachViewRow => ({
  lifterName: 'John Doe',
  e1rmDisplay: '225 lbs',
  lastPerformedDisplay: 'Today',
  targetWeightDisplay: '185 lbs',
  hasData: true,
  ...overrides,
});

const mockCoachViewSelection = (overrides?: Partial<ReturnType<typeof useCoachViewSelection>>) => ({
  exerciseOptions: ['Bench Press', 'Squat', 'Deadlift'],
  displayNameToCanonical: new Map([
    ['Bench Press', 'bench-classic'],
    ['Squat', 'squat-classic'],
    ['Deadlift', 'deadlift-classic'],
  ]),
  selectedDisplayName: '',
  setSelectedDisplayName: vi.fn(),
  reps: 1,
  setReps: vi.fn(),
  unit: 'lbs' as const,
  setUnit: vi.fn(),
  toggleUnit: vi.fn(),
  selectedCanonical: null,
  rows: [],
  erroredLifterCount: 0,
  ...overrides,
});

describe('CoachViewPage', () => {
  beforeEach(() => {
    // useCoachViewSelection is called unconditionally (rules of hooks), even while
    // useCoachViewData is still loading/erroring, so give it a sane default here;
    // individual success-state tests override this via mockReturnValue.
    vi.mocked(useCoachViewSelection).mockReturnValue(mockCoachViewSelection());
  });

  it('renders loading state', () => {
    vi.mocked(useCoachViewData).mockReturnValue({ status: 'loading' });

    render(<CoachViewPage />);

    expect(screen.getByText(/loading lifters/i)).toBeDefined();
  });

  it('renders error state with message', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'error',
      message: 'Failed to fetch sheets',
    });

    render(<CoachViewPage />);

    expect(screen.getByText('Failed to fetch sheets')).toBeDefined();
  });

  it.each([
    ['with no selection', [], mockCoachViewSelection({ selectedCanonical: null, rows: [] }), false],
    [
      'with selection and rows',
      [],
      mockCoachViewSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({ lifterName: 'Alice' }),
          mockRow({ lifterName: 'Bob', e1rmDisplay: '275 lbs' }),
        ],
      }),
      false,
    ],
    [
      'with errored lifters',
      [],
      mockCoachViewSelection({
        selectedCanonical: 'squat-classic',
        selectedDisplayName: 'Squat',
        rows: [mockRow({ lifterName: 'Charlie' })],
        erroredLifterCount: 2,
      }),
      true,
    ],
  ])('renders success state %s', (_, lifterResults, selectionState, shouldShowErrorNote) => {
    const results = lifterResults.length > 0 ? lifterResults : [mockLifterResult('Lifter 1')];
    vi.mocked(useCoachViewData).mockReturnValue({ status: 'success', data: results });
    vi.mocked(useCoachViewSelection).mockReturnValue(selectionState);

    render(<CoachViewPage />);

    // TypeaheadDropdown should be rendered
    expect(screen.getByPlaceholderText('Search exercise...')).toBeDefined();

    // Reps input should be visible
    const repsInput = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(repsInput).toBeDefined();
    expect(repsInput.value).toBe('1');

    // Unit toggle button should be present
    expect(screen.getByRole('button', { name: 'lbs' })).toBeDefined();

    // If there are selected canonical and rows, table should render
    if (selectionState.selectedCanonical && selectionState.rows.length > 0) {
      expect(screen.getByText(new RegExp(selectionState.selectedDisplayName))).toBeDefined();
      expect(screen.getByRole('table')).toBeDefined();
      expect(screen.getAllByRole('row')).toHaveLength(
        selectionState.rows.length + 1 // +1 for header
      );

      // Check if rows are rendered by checking for lifter names
      for (const row of selectionState.rows) {
        expect(screen.getByText(row.lifterName)).toBeDefined();
      }
    }

    // Check error note if there are errored lifters
    if (shouldShowErrorNote) {
      expect(screen.getByText(/\d+ lifters could not be loaded/)).toBeDefined();
    }
  });

  it('displays singular "lifter" when erroredLifterCount is 1', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockCoachViewSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        erroredLifterCount: 1,
      })
    );

    render(<CoachViewPage />);

    expect(screen.getByText('1 lifter could not be loaded')).toBeDefined();
  });

  it('displays plural "lifters" when erroredLifterCount > 1', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockCoachViewSelection({
        selectedCanonical: 'deadlift-classic',
        selectedDisplayName: 'Deadlift',
        rows: [mockRow()],
        erroredLifterCount: 3,
      })
    );

    render(<CoachViewPage />);

    expect(screen.getByText('3 lifters could not be loaded')).toBeDefined();
  });

  it('shows empty state when exercise selected but no rows', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockCoachViewSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [],
      })
    );

    render(<CoachViewPage />);

    expect(screen.getByText('No data for this exercise yet')).toBeDefined();
  });

  it('renders placeholder rows for lifters with no data', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockCoachViewSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({ lifterName: 'Alice' }),
          mockRow({
            lifterName: 'Dana',
            e1rmDisplay: '—',
            lastPerformedDisplay: 'No data logged',
            targetWeightDisplay: '—',
            hasData: false,
          }),
        ],
      })
    );

    render(<CoachViewPage />);

    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Dana')).toBeDefined();
    expect(screen.getByText('No data logged')).toBeDefined();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});

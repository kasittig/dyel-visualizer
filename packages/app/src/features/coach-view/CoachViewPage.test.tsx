import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { PipelineModel, AthleteContext, LifterPipelineResult } from '@dyel/api';
import { CoachViewPage } from './CoachViewPage';
import type { CoachViewRow } from './useCoachViewSelection';

type SelectionState = ReturnType<typeof useCoachViewSelection>;

vi.mock('./useCoachViewData', () => ({ useCoachViewData: vi.fn() }));
vi.mock('./useCoachViewSelection', () => ({ useCoachViewSelection: vi.fn() }));

const { useCoachViewData } = await import('./useCoachViewData');
const { useCoachViewSelection } = await import('./useCoachViewSelection');

afterEach(cleanup);

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
): LifterPipelineResult =>
  status === 'error'
    ? { status: 'error', name, url: `https://example.com{name}`, message: 'Failed to load' }
    : { status: 'success', name, url: `https://example.com{name}`, model: mockPipelineModel() };

const mockRow = (overrides?: Partial<CoachViewRow>): CoachViewRow => ({
  lifterName: 'John Doe',
  e1rmDisplay: '225 lbs',
  lastPerformedDisplay: 'Today',
  targetWeightDisplay: '185 lbs',
  hasData: true,
  ...overrides,
});

const mockSelection = (overrides?: Partial<SelectionState>): SelectionState => ({
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
  unit: 'lbs',
  setUnit: vi.fn(),
  toggleUnit: vi.fn(),
  selectedCanonical: null,
  rows: [],
  erroredLifterCount: 0,
  ...overrides,
});

describe('CoachViewPage', () => {
  beforeEach(() => {
    vi.mocked(useCoachViewSelection).mockReturnValue(mockSelection());
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
    ['with no selection', [], mockSelection({ selectedCanonical: null, rows: [] }), false],
    [
      'with selection and rows',
      [],
      mockSelection({
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
      mockSelection({
        selectedCanonical: 'squat-classic',
        selectedDisplayName: 'Squat',
        rows: [mockRow({ lifterName: 'Charlie' })],
        erroredLifterCount: 2,
      }),
      true,
    ],
  ] as Array<[string, LifterPipelineResult[], SelectionState, boolean]>)(
    'renders success state %s',
    (_, lifterResults, selectionState, shouldShowErrorNote) => {
      vi.mocked(useCoachViewData).mockReturnValue({
        status: 'success',
        data: lifterResults.length ? lifterResults : [mockLifterResult('Lifter 1')],
      });
      vi.mocked(useCoachViewSelection).mockReturnValue(selectionState);
      render(<CoachViewPage />);

      expect(screen.getByPlaceholderText('Search exercise...')).toBeDefined();
      expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('1');
      expect(screen.getByRole('button', { name: 'lbs' })).toBeDefined();

      if (selectionState.selectedCanonical && selectionState.rows.length) {
        expect(screen.getByPlaceholderText('Search exercise...')).toHaveProperty(
          'value',
          selectionState.selectedDisplayName
        );
        expect(screen.getByRole('table')).toBeDefined();
        expect(screen.getAllByRole('row')).toHaveLength(selectionState.rows.length + 1);
        selectionState.rows.forEach((r) => expect(screen.getByText(r.lifterName)).toBeDefined());
      }
      if (shouldShowErrorNote) {
        expect(screen.getByText(/\d+ lifters could not be loaded/)).toBeDefined();
      }
    }
  );

  it.each([
    [1, '1 lifter could not be loaded', 'bench-classic', 'Bench Press'],
    [3, '3 lifters could not be loaded', 'deadlift-classic', 'Deadlift'],
  ] as Array<[number, string, string, string]>)(
    'displays correct wording when erroredLifterCount is %i',
    (count, text, canonical, display) => {
      vi.mocked(useCoachViewData).mockReturnValue({
        status: 'success',
        data: [mockLifterResult('Lifter 1')],
      });
      vi.mocked(useCoachViewSelection).mockReturnValue(
        mockSelection({
          selectedCanonical: canonical,
          selectedDisplayName: display,
          rows: [mockRow()],
          erroredLifterCount: count,
        })
      );
      render(<CoachViewPage />);
      expect(screen.getByText(text)).toBeDefined();
    }
  );

  it('shows empty state when exercise selected but no rows', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
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
      mockSelection({
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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PipelineModel, AthleteContext, LifterPipelineResult } from '@dyel/api';
import { CoachViewPage } from './CoachViewPage';
import type { CoachViewRow } from './useCoachViewSelection';

type SelectionState = ReturnType<typeof useCoachViewSelection>;

vi.mock('./useCoachViewData', () => ({ useCoachViewData: vi.fn() }));
vi.mock('./useCoachViewSelection', () => ({ useCoachViewSelection: vi.fn() }));

const { useCoachViewData } = await import('./useCoachViewData');
const { useCoachViewSelection } = await import('./useCoachViewSelection');

afterEach(cleanup);

const mockAthlete: AthleteContext = { sex: 'M', bodyweight: 90 };
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

const mockRow = (overrides?: Partial<CoachViewRow>): CoachViewRow =>
  ({
    lifterName: 'John Doe',
    e1rmDisplay: '225 lbs',
    e1rmProjectedDisplay: null,
    e1rmSourceLabel: null,
    lastPerformedDateDisplay: '1/1',
    lastPerformedSetDisplay: 'Today',
    targetWeightDisplay: '185 lbs',
    targetWeightProjectedDisplay: null,
    showProjected: false,
    onToggleProjected: vi.fn(),
    sessionCount: 4,
    hasData: true,
    effectiveDisplayName: 'Bench Press',
    effectiveReps: 1,
    availableExerciseOptions: ['Bench Press', 'Squat', 'Deadlift'],
    onExerciseChange: vi.fn(),
    onRepsChange: vi.fn(),
    ...overrides,
  }) as CoachViewRow;

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
  selectedBar: null,
  setSelectedBar: vi.fn(),
  selectedStance: null,
  setSelectedStance: vi.fn(),
  selectedEquipment: null,
  setSelectedEquipment: vi.fn(),
  selectedAddlWt: null,
  setSelectedAddlWt: vi.fn(),
  barOptions: ['ssb', 'standard'],
  stanceOptions: ['sumo', 'conventional'],
  equipmentOptions: ['board', 'pause'],
  addlWtOptions: ['bands', 'chains'],
  selectedLiftType: null,
  setSelectedLiftType: vi.fn(),
  liftTypeOptions: ['squat', 'bench', 'deadlift', 'accessory'],
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

      const exerciseInputs = screen.getAllByPlaceholderText('Search exercise...');
      expect(exerciseInputs.length).toBeGreaterThan(0);
      expect((screen.getAllByRole('spinbutton')[0] as HTMLInputElement).value).toBe('1');
      expect(screen.getByRole('button', { name: 'lbs' })).toBeDefined();

      if (selectionState.selectedCanonical && selectionState.rows.length) {
        expect((exerciseInputs[0] as HTMLInputElement).value).toBe(
          selectionState.selectedDisplayName
        );
        expect(screen.getByRole('table')).toBeDefined();
        expect(screen.getAllByRole('row')).toHaveLength(selectionState.rows.length + 1);
        expect(screen.getByText('Sessions')).toBeDefined();
        selectionState.rows.forEach((r) => expect(screen.getByText(r.lifterName)).toBeDefined());
        expect(screen.getAllByText('4').length).toBeGreaterThan(0);
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
            lastPerformedDateDisplay: '—',
            lastPerformedSetDisplay: 'No data logged',
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
    // 3 em-dashes from Dana's placeholder cells (e1rmDisplay, targetWeightDisplay,
    // lastPerformedDateDisplay) + 4 em-dashes from the 4 facet select empty options
    expect(screen.getAllByText('—')).toHaveLength(7);
  });

  it('renders a per-row exercise dropdown and reps input for each lifter', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1'), mockLifterResult('Lifter 2')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow({ lifterName: 'Alice' }), mockRow({ lifterName: 'Bob' })],
      })
    );
    render(<CoachViewPage />);

    // one exercise input for the top-level control + one per row
    expect(screen.getAllByPlaceholderText('Search exercise...')).toHaveLength(3);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  });

  it('calls the row-specific onExerciseChange/onRepsChange when that row changes', () => {
    const aliceRepsChange = vi.fn();
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1'), mockLifterResult('Lifter 2')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({ lifterName: 'Alice', onRepsChange: aliceRepsChange }),
          mockRow({ lifterName: 'Bob' }),
        ],
      })
    );
    render(<CoachViewPage />);

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 0 is the top-level reps input; index 1 is Alice's row
    fireEvent.change(spinbuttons[1], { target: { value: '4' } });
    expect(aliceRepsChange).toHaveBeenCalledWith(4);
  });

  it('renders per-row inputs even for placeholder rows with no data', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow({ lifterName: 'Dana', hasData: false })],
      })
    );
    render(<CoachViewPage />);

    expect(screen.getAllByPlaceholderText('Search exercise...')).toHaveLength(2);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
  });

  it('renders facet filter selects and wires their onChange handlers', () => {
    const setSelectedBar = vi.fn();
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        setSelectedBar,
      })
    );
    render(<CoachViewPage />);

    expect(screen.getByRole('combobox', { name: 'Bar' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Stance' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Equipment' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Additional Weight' })).toBeDefined();

    fireEvent.change(screen.getByRole('combobox', { name: 'Bar' }), {
      target: { value: 'ssb' },
    });
    expect(setSelectedBar).toHaveBeenCalledWith('ssb');
  });

  it('defaults facet selects to the unfiltered "—" option', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
      })
    );
    render(<CoachViewPage />);

    expect((screen.getByRole('combobox', { name: 'Bar' }) as HTMLSelectElement).value).toBe('');
    expect(
      (screen.getByRole('combobox', { name: 'Additional Weight' }) as HTMLSelectElement).value
    ).toBe('');
  });

  it('renders an All chip plus one chip per liftTypeOptions entry', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
      })
    );
    render(<CoachViewPage />);

    expect(screen.getByRole('button', { name: 'All' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Squat' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bench' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Deadlift' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Accessory' })).toBeDefined();
  });

  it('clicking a lift type chip calls setSelectedLiftType with that type', () => {
    const setSelectedLiftType = vi.fn();
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        setSelectedLiftType,
      })
    );
    render(<CoachViewPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Squat' }));
    expect(setSelectedLiftType).toHaveBeenCalledWith('squat');

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(setSelectedLiftType).toHaveBeenCalledWith(null);
  });

  it('the All chip is active by default (no lift type selected)', () => {
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
      })
    );
    render(<CoachViewPage />);

    expect(screen.getByRole('button', { name: 'All' }).className).toMatch(/chipActive/);
    expect(screen.getByRole('button', { name: 'Squat' }).className).not.toMatch(/chipActive/);
  });

  it('renders a toggleable e1RM cell when a projected value differs from actual', () => {
    const onToggleProjected = vi.fn();
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({
            lifterName: 'Alice',
            e1rmDisplay: '225 lbs',
            e1rmProjectedDisplay: '230 lbs',
            e1rmSourceLabel: 'Based on Bench Press · 1/1/2024',
            onToggleProjected,
          }),
        ],
      })
    );
    render(<CoachViewPage />);

    expect(screen.getByText('225 lbs')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /225 lbs/ }));
    expect(onToggleProjected).toHaveBeenCalled();
  });

  it('toggling e1RM projection also changes the Target weight display for that row', () => {
    const onToggleProjected = vi.fn();
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({
            lifterName: 'Alice',
            e1rmDisplay: '225 lbs',
            e1rmProjectedDisplay: '230 lbs',
            e1rmSourceLabel: 'Based on Bench Press · 1/1/2024',
            targetWeightDisplay: '185 lbs',
            targetWeightProjectedDisplay: '188 lbs',
            showProjected: false,
            onToggleProjected,
          }),
        ],
      })
    );
    render(<CoachViewPage />);

    // Initially shows actual values
    expect(screen.getByText('225 lbs')).toBeDefined();
    expect(screen.getByText('185 lbs')).toBeDefined();

    // Toggle the e1RM projection
    fireEvent.click(screen.getByRole('button', { name: /225 lbs/ }));
    expect(onToggleProjected).toHaveBeenCalled();
  });
});

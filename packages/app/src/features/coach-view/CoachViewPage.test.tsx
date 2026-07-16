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

const mockRow = (overrides?: Partial<CoachViewRow>): CoachViewRow => ({
  lifterName: 'John Doe',
  e1rmDisplay: '225 lbs',
  lastPerformedDateDisplay: '1/1',
  lastPerformedSetDisplay: 'Today',
  targetWeightDisplay: '185 lbs',
  sessionCount: 4,
  hasData: true,
  effectiveDisplayName: 'Bench Press',
  effectiveReps: 1,
  effectiveEffortMode: 'rpe',
  effectiveEffortValue: 10,
  availableExerciseOptions: ['Bench Press', 'Squat', 'Deadlift'],
  onExerciseChange: vi.fn(),
  onRepsChange: vi.fn(),
  onEffortModeChange: vi.fn(),
  onEffortValueChange: vi.fn(),
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
  effortMode: 'rpe',
  setEffortMode: vi.fn(),
  effortValue: 10,
  setEffortValue: vi.fn(),
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
    // top-level reps + effort inputs (2) + one reps input per row (2) + one effort input per row (2) = 6
    expect(screen.getAllByRole('spinbutton')).toHaveLength(6);
  });

  it('renders per-row effort controls with correct values', () => {
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

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 0: top-level reps, 1: top-level effort, 2: Alice's reps, 3: Alice's effort, 4: Bob's reps, 5: Bob's effort
    expect(spinbuttons[1].value).toBe('10'); // top-level effort
    expect(spinbuttons[3].value).toBe('10'); // Alice's effort
    expect(spinbuttons[5].value).toBe('10'); // Bob's effort
  });

  it('calls row-specific onEffortValueChange/onEffortModeChange when that row changes', () => {
    const aliceEffortValueChange = vi.fn();
    const aliceEffortModeChange = vi.fn();
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1'), mockLifterResult('Lifter 2')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({
            lifterName: 'Alice',
            onEffortValueChange: aliceEffortValueChange,
            onEffortModeChange: aliceEffortModeChange,
          }),
          mockRow({ lifterName: 'Bob' }),
        ],
      })
    );
    render(<CoachViewPage />);

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 0: top-level reps, 1: top-level effort, 2: Alice's reps, 3: Alice's effort
    fireEvent.change(spinbuttons[3], { target: { value: '8' } });
    expect(aliceEffortValueChange).toHaveBeenCalledWith(8);

    // Click the RPE chip for Alice's row (second RPE button - first is in header, second is Alice's row)
    const rpeButtons = screen.getAllByRole('button', { name: 'RPE' });
    fireEvent.click(rpeButtons[1]); // second RPE button
    expect(aliceEffortModeChange).toHaveBeenCalledWith('rpe');
  });

  it('renders top-level effort input and RPE/% mode toggle in header', () => {
    const setEffortValue = vi.fn();
    const setEffortMode = vi.fn();
    vi.mocked(useCoachViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useCoachViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        setEffortValue,
        setEffortMode,
      })
    );
    render(<CoachViewPage />);

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 0 is the top-level reps input; index 1 is the top-level effort input
    expect(spinbuttons[1].value).toBe('10');

    fireEvent.change(spinbuttons[1], { target: { value: '9' } });
    expect(setEffortValue).toHaveBeenCalledWith(9);

    // Click the top-level RPE button
    const rpeButtons = screen.getAllByRole('button', { name: 'RPE' });
    fireEvent.click(rpeButtons[0]); // first RPE button is in header
    expect(setEffortMode).toHaveBeenCalledWith('rpe');
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
    // index 0: top-level reps, 1: top-level effort, 2: Alice's reps
    fireEvent.change(spinbuttons[2], { target: { value: '4' } });
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
    // top-level reps + effort inputs (2) + one row's reps + effort inputs (2) = 4
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
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
});

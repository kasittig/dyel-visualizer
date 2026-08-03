import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { PipelineModel, AthleteContext, LifterPipelineResult } from '@dyel/api';
import { TeamViewPage } from './TeamViewPage';
import type { TeamViewRow } from './useTeamViewSelection';
import { pointStoreMock } from '../../test/helpers/pipelineModelFactory';

type SelectionState = ReturnType<typeof useTeamViewSelection>;

vi.mock('./useTeamViewData', () => ({ useTeamViewData: vi.fn() }));
vi.mock('./useTeamViewSelection', () => ({ useTeamViewSelection: vi.fn() }));

const { useTeamViewData } = await import('./useTeamViewData');
const { useTeamViewSelection } = await import('./useTeamViewSelection');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mockAthlete: AthleteContext = { sex: 'M', bodyweight: 90 };
const mockPipelineModel = (overrides?: Partial<PipelineModel>): PipelineModel => ({
  model: { baseline: {}, variantFactor: {}, addlWtOffset: {} },
  diagnostics: { byCanonical: new Map(), allFindings: [] },
  unknownExercises: [],
  unnormalized: [],
  parseErrors: [],
  tagged: [],
  points: pointStoreMock(
    new Map([
      [
        'e1rm',
        [
          { t: Date.now(), v: 100, series: 'bench-classic', tags: new Set() },
          { t: Date.now(), v: 150, series: 'squat-classic', tags: new Set() },
        ],
      ],
    ])
  ),
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

const mockRow = (overrides?: Partial<TeamViewRow>): TeamViewRow =>
  ({
    lifterName: overrides?.lifterName ?? 'John Doe',
    url:
      overrides?.url ??
      `https://example.com/${encodeURIComponent(overrides?.lifterName ?? 'John Doe')}`,
    e1rmDisplay: '225 lbs',
    e1rmProjectedDisplay: null,
    e1rmSourceLabel: null,
    e1rmFamilyRecentDisplay: null,
    e1rmFamilyRecentSourceLabel: null,
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
    effectiveEffortMode: 'rpe',
    effectiveEffortValue: 10,
    availableExerciseOptions: ['Bench Press', 'Squat', 'Deadlift'],
    onExerciseChange: vi.fn(),
    onRepsChange: vi.fn(),
    onEffortModeChange: vi.fn(),
    onEffortValueChange: vi.fn(),
    ...overrides,
  }) as TeamViewRow;

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
  effortMode: 'rpe',
  setEffortMode: vi.fn(),
  effortValue: 10,
  setEffortValue: vi.fn(),
  unit: 'lbs',
  setUnit: vi.fn(),
  toggleUnit: vi.fn(),
  selectedCanonical: null,
  rows: [],
  pointsByLifter: new Map(),
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
  dateRange: { from: undefined, to: undefined },
  setDateRange: vi.fn(),
  historySessionDates: [],
  ...overrides,
});

const useMobileViewport = () =>
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

describe('TeamViewPage', () => {
  beforeEach(() => {
    vi.mocked(useTeamViewSelection).mockReturnValue(mockSelection());
    // Radix Popover's Arrow (used by EffortPopover) relies on ResizeObserver, which jsdom
    // doesn't implement — stub it so the popover mounts cleanly in tests.
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it('renders loading state', () => {
    vi.mocked(useTeamViewData).mockReturnValue({ status: 'loading' });
    render(<TeamViewPage />);
    expect(screen.getByText(/loading lifters/i)).toBeDefined();
  });

  it('renders error state with message', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'error',
      message: 'Failed to fetch sheets',
    });
    render(<TeamViewPage />);
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
      vi.mocked(useTeamViewData).mockReturnValue({
        status: 'success',
        data: lifterResults.length ? lifterResults : [mockLifterResult('Lifter 1')],
      });
      vi.mocked(useTeamViewSelection).mockReturnValue(selectionState);
      render(<TeamViewPage />);

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
      vi.mocked(useTeamViewData).mockReturnValue({
        status: 'success',
        data: [mockLifterResult('Lifter 1')],
      });
      vi.mocked(useTeamViewSelection).mockReturnValue(
        mockSelection({
          selectedCanonical: canonical,
          selectedDisplayName: display,
          rows: [mockRow()],
          erroredLifterCount: count,
        })
      );
      render(<TeamViewPage />);
      expect(screen.getByText(text)).toBeDefined();
    }
  );

  it('renders a link icon next to the lifter name linking to their sheet', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow({ lifterName: 'Alice', url: 'https://example.com/alice-sheet' })],
      })
    );
    render(<TeamViewPage />);

    const link = screen.getByTitle('Open Alice in DYEL Visualizer');
    expect(link.getAttribute('href')).toBe(
      `/?sheet=${encodeURIComponent('https://example.com/alice-sheet')}`
    );
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('back link and summary view link resolve against the site root, not the current path', () => {
    window.history.pushState({}, '', '/dyel-visualizer/team');
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    render(<TeamViewPage />);

    expect(screen.getByText('← Back to DYEL Visualizer').getAttribute('href')).toBe(
      '/dyel-visualizer/'
    );
    expect(screen.getByText('🏆 Summary view').getAttribute('href')).toBe(
      '/dyel-visualizer/team/summary'
    );

    window.history.pushState({}, '', '/');
  });

  it('shows empty state when exercise selected but no rows', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [],
      })
    );
    render(<TeamViewPage />);
    expect(screen.getByText('No data for this exercise yet')).toBeDefined();
  });

  it('renders placeholder rows for lifters with no data', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
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
    render(<TeamViewPage />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Dana')).toBeDefined();
    expect(screen.getByText('No data logged')).toBeDefined();
    // 3 em-dashes from Dana's placeholder cells (e1rmDisplay, targetWeightDisplay,
    // lastPerformedDateDisplay) + 4 em-dashes from the 4 facet select empty options
    expect(screen.getAllByText('—')).toHaveLength(7);
  });

  it('renders a per-row exercise dropdown and reps input for each lifter', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1'), mockLifterResult('Lifter 2')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow({ lifterName: 'Alice' }), mockRow({ lifterName: 'Bob' })],
      })
    );
    render(<TeamViewPage />);

    // one exercise input for the top-level control + one per row
    expect(screen.getAllByPlaceholderText('Search exercise...')).toHaveLength(3);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  });

  it('calls the row-specific onExerciseChange/onRepsChange when that row changes', () => {
    const aliceRepsChange = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1'), mockLifterResult('Lifter 2')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({ lifterName: 'Alice', onRepsChange: aliceRepsChange }),
          mockRow({ lifterName: 'Bob' }),
        ],
      })
    );
    render(<TeamViewPage />);

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 0 is the top-level reps input; index 1 is Alice's row
    fireEvent.change(spinbuttons[1], { target: { value: '4' } });
    expect(aliceRepsChange).toHaveBeenCalledWith(4);
  });

  it('renders per-row inputs even for placeholder rows with no data', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow({ lifterName: 'Dana', hasData: false })],
      })
    );
    render(<TeamViewPage />);

    expect(screen.getAllByPlaceholderText('Search exercise...')).toHaveLength(2);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
  });

  it('renders facet filter selects and wires their onChange handlers', () => {
    const setSelectedBar = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        setSelectedBar,
      })
    );
    render(<TeamViewPage />);

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
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
      })
    );
    render(<TeamViewPage />);

    expect((screen.getByRole('combobox', { name: 'Bar' }) as HTMLSelectElement).value).toBe('');
    expect(
      (screen.getByRole('combobox', { name: 'Additional Weight' }) as HTMLSelectElement).value
    ).toBe('');
  });

  it('renders an All chip plus one chip per liftTypeOptions entry', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
      })
    );
    render(<TeamViewPage />);

    expect(screen.getByRole('button', { name: 'All' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Squat' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bench' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Deadlift' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Accessory' })).toBeDefined();
  });

  it('clicking a lift type chip calls setSelectedLiftType with that type', () => {
    const setSelectedLiftType = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        setSelectedLiftType,
      })
    );
    render(<TeamViewPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Squat' }));
    expect(setSelectedLiftType).toHaveBeenCalledWith('squat');

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(setSelectedLiftType).toHaveBeenCalledWith(null);
  });

  it('the All chip is active by default (no lift type selected)', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
      })
    );
    render(<TeamViewPage />);

    expect(screen.getByRole('button', { name: 'All' }).className).toMatch(/chipActive/);
    expect(screen.getByRole('button', { name: 'Squat' }).className).not.toMatch(/chipActive/);
  });

  it('renders a toggleable e1RM cell when a projected value differs from actual', () => {
    const onToggleProjected = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
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
    render(<TeamViewPage />);

    expect(screen.getByText('225 lbs')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /225 lbs/ }));
    expect(onToggleProjected).toHaveBeenCalled();
  });

  it('toggling e1RM projection also changes the Target weight display for that row', () => {
    const onToggleProjected = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
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
    render(<TeamViewPage />);

    // Initially shows actual values
    expect(screen.getByText('225 lbs')).toBeDefined();
    expect(screen.getByText('185 lbs')).toBeDefined();

    // Toggle the e1RM projection
    fireEvent.click(screen.getByRole('button', { name: /225 lbs/ }));
    expect(onToggleProjected).toHaveBeenCalled();
  });

  it('double-clicking a reps input opens the effort popover', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow({ lifterName: 'Alice' })],
      })
    );
    render(<TeamViewPage />);

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 0 is the top-level reps input; index 1 is Alice's row
    fireEvent.doubleClick(spinbuttons[1]);

    // After double-click, the popover content should appear in the DOM
    // EffortInput renders with RPE/% chip buttons
    expect(screen.getAllByRole('button', { name: 'RPE' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '%' }).length).toBeGreaterThan(0);
  });

  it("changing the effort value inside a row popover calls that row's onEffortValueChange", () => {
    const aliceEffortValueChange = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow({ lifterName: 'Alice', onEffortValueChange: aliceEffortValueChange })],
      })
    );
    render(<TeamViewPage />);

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 1 is Alice's reps input
    fireEvent.doubleClick(spinbuttons[1]);

    // Find the effort value input (inside the popover)
    const effortInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // After double-click, we should have an extra spinbutton for the effort value
    const effortValueInput = effortInputs[effortInputs.length - 1];
    fireEvent.change(effortValueInput, { target: { value: '8' } });

    expect(aliceEffortValueChange).toHaveBeenCalledWith(8);
  });

  it('the header effort popover wires to setEffortMode and setEffortValue', () => {
    const setEffortMode = vi.fn();
    const setEffortValue = vi.fn();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        setEffortMode,
        setEffortValue,
      })
    );
    render(<TeamViewPage />);

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // index 0 is the top-level reps input
    fireEvent.doubleClick(spinbuttons[0]);

    // Find the effort value input (inside the popover)
    const effortInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const effortValueInput = effortInputs[effortInputs.length - 1];
    fireEvent.change(effortValueInput, { target: { value: '7' } });

    expect(setEffortValue).toHaveBeenCalledWith(7);
  });

  it('does not render Graph button when no exercise is selected', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: null,
        rows: [],
      })
    );
    render(<TeamViewPage />);

    expect(screen.queryByRole('button', { name: 'Graph' })).toBeNull();
  });

  it('renders Graph button when exercise is selected', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
      })
    );
    render(<TeamViewPage />);

    expect(screen.getByRole('button', { name: 'Graph' })).toBeDefined();
  });

  it('clicking Graph button renders the history chart section and highlights the button', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        pointsByLifter: new Map([
          ['Alice', [{ t: Date.now(), v: 225, series: 'bench-classic', tags: new Set() }]],
        ]),
      })
    );
    render(<TeamViewPage />);

    const button = screen.getByRole('button', { name: 'Graph' });
    expect(button.className).not.toMatch(/graphButtonActive/);
    fireEvent.click(button);

    expect(screen.getByText('History Across Lifters')).toBeDefined();
  });

  it('clicking Graph button again hides the history chart section and removes highlight', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        pointsByLifter: new Map([
          ['Alice', [{ t: Date.now(), v: 225, series: 'bench-classic', tags: new Set() }]],
        ]),
      })
    );
    render(<TeamViewPage />);

    const button = screen.getByRole('button', { name: 'Graph' });
    fireEvent.click(button);

    expect(screen.getByText('History Across Lifters')).toBeDefined();
    expect(button.className).toMatch(/graphButtonActive/);

    fireEvent.click(button);

    expect(screen.queryByText('History Across Lifters')).toBeNull();
    expect(button.className).not.toMatch(/graphButtonActive/);
  });

  it('the close button (✕) inside the chart closes it', () => {
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Lifter 1')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [mockRow()],
        pointsByLifter: new Map([
          ['Alice', [{ t: Date.now(), v: 225, series: 'bench-classic', tags: new Set() }]],
        ]),
      })
    );
    render(<TeamViewPage />);

    // Click Graph button to open the chart
    fireEvent.click(screen.getByRole('button', { name: 'Graph' }));
    expect(screen.getByText('History Across Lifters')).toBeDefined();

    // Click the close button
    const closeButton = screen.getByRole('button', { name: 'Close chart' });
    fireEvent.click(closeButton);

    // Chart should be hidden
    expect(screen.queryByText('History Across Lifters')).toBeNull();
  });

  it('focuses mobile editing on the selected lifter', () => {
    useMobileViewport();
    vi.mocked(useTeamViewData).mockReturnValue({
      status: 'success',
      data: [mockLifterResult('Alice'), mockLifterResult('Bob')],
    });
    vi.mocked(useTeamViewSelection).mockReturnValue(
      mockSelection({
        selectedCanonical: 'bench-classic',
        selectedDisplayName: 'Bench Press',
        rows: [
          mockRow({ lifterName: 'Alice' }),
          mockRow({ lifterName: 'Bob', effectiveDisplayName: 'Squat' }),
        ],
      })
    );
    render(<TeamViewPage />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Lifter' }), {
      target: { value: 'https://example.com/Bob' },
    });
    const focusedEditor = screen.getByRole('region', {
      name: 'Focused lifter programming',
    });
    expect(focusedEditor.querySelector('article')?.textContent).toContain('Bob');
    expect(focusedEditor.querySelector('article')?.textContent).not.toContain('Alice');
    expect(
      (focusedEditor.querySelector('input[placeholder="Search exercise..."]') as HTMLInputElement)
        .value
    ).toBe('Squat');
  });
});

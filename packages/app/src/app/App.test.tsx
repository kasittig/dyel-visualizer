import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const setActiveTab = vi.fn();

vi.mock('./useAppSettings', () => ({
  useAppSettings: () => ({
    url: 'https://docs.google.com/spreadsheets/d/test/pubhtml',
    inputMode: 'url',
    pastedText: '',
    panelForcedOpen: false,
    setPanelForcedOpen: vi.fn(),
    refreshToken: 0,
    setRefreshToken: vi.fn(),
    activeTab: 'sigma',
    setActiveTab,
    lastLiftTab: 'squat',
    setLastLiftTab: vi.fn(),
    shownResetToken: 0,
    athleteBase: undefined,
    dateRange: {},
    setDateRange: vi.fn(),
    handleUrlChange: vi.fn(),
    handleTextChange: vi.fn(),
    handleModeChange: vi.fn(),
  }),
}));

vi.mock('./usePipelineOrchestration', () => ({
  usePipelineOrchestration: () => ({
    status: 'success',
    model: {},
    invalidUrl: false,
    textValidation: { isValid: true },
  }),
}));

vi.mock('./useVisualizerData', () => ({
  useVisualizerData: () => ({
    tabRows: [],
    visibleLiftIds: new Set(['squat', 'bench', 'deadlift', 'accessory']),
    defaultCanonicals: { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift', accessory: 'Row' },
    dataUnit: 'lbs',
    volumeByDate: [],
    allSessionDates: [new Date('2026-01-01')],
    lastSessionDate: undefined,
  }),
}));

vi.mock('./PipelineContext', () => ({
  PipelineProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock('../features/data-source/SheetUrlPanel', () => ({
  SheetUrlPanel: () => <header>Data header</header>,
}));
vi.mock('../features/data-source/GettingStarted', () => ({ GettingStarted: () => null }));
vi.mock('../features/sigma/SigmaTab', () => ({ SigmaTab: () => <div>Overview content</div> }));
vi.mock('../features/lift/LiftTabPanel', () => ({ LiftTabPanel: () => null }));
vi.mock('../features/calculator/RepCalculator', () => ({ RepCalculator: () => null }));
vi.mock('../features/calculator/StrengthScoreCalculator', () => ({
  StrengthScoreCalculator: () => null,
}));
vi.mock('../shared/components/DateRangePicker', () => ({
  DateRangePicker: () => <button>Date picker</button>,
}));

describe('desktop workspace controls', () => {
  afterEach(() => {
    cleanup();
    setActiveTab.mockClear();
  });

  it('exposes distinct primary navigation and a globally scoped filter toolbar', () => {
    render(<App />);

    const desktopNav = screen.getByRole('navigation', { name: 'Visualization views' });
    expect(within(desktopNav).getByRole('tab', { name: 'Overview' })).toBeTruthy();
    expect(within(desktopNav).getByRole('tab', { name: 'Accessories' })).toBeTruthy();

    const toolbar = screen.getByRole('toolbar', { name: 'Training period' });
    const periodToggle = within(toolbar).getByRole('button', { name: /Training period/ });
    expect(periodToggle.getAttribute('aria-expanded')).toBe('false');
    expect(within(toolbar).queryByRole('button', { name: 'Date picker' })).toBeNull();
    fireEvent.click(periodToggle);
    expect(periodToggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(toolbar).getByText('Applies to all charts and calculations')).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Date picker' })).toBeTruthy();

    fireEvent.click(within(desktopNav).getByRole('tab', { name: 'Bench' }));
    expect(setActiveTab).toHaveBeenCalledWith('bench');
  });
});

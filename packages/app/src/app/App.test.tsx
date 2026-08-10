import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const setActiveTab = vi.fn();
const appSettingsState = vi.hoisted(() => ({
  url: 'https://docs.google.com/spreadsheets/d/test/pubhtml',
  inputMode: 'url' as const,
  pastedText: '',
}));
const orchestrationState = vi.hoisted(() => ({
  status: 'success' as 'idle' | 'loading' | 'success' | 'error',
  requestStatus: 'success' as 'idle' | 'loading' | 'success' | 'error',
  lastUpdatedAt: null as Date | null,
  isUsingCachedData: false,
  model: {},
}));
const visualizerState = vi.hoisted(() => ({
  visibleLiftIds: new Set(['squat', 'bench', 'deadlift', 'accessory']),
}));

vi.mock('./useAppSettings', () => ({
  useAppSettings: () => ({
    ...appSettingsState,
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
  usePipelineOrchestration: () => orchestrationState,
}));

vi.mock('./useVisualizerData', () => ({
  useVisualizerData: () => ({
    tabRows: [],
    visibleLiftIds: visualizerState.visibleLiftIds,
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
    Object.assign(orchestrationState, {
      status: 'success',
      requestStatus: 'success',
      lastUpdatedAt: null,
      isUsingCachedData: false,
      model: {},
    });
    visualizerState.visibleLiftIds = new Set(['squat', 'bench', 'deadlift', 'accessory']);
    appSettingsState.url = 'https://docs.google.com/spreadsheets/d/test/pubhtml';
  });

  it('keeps My Training discoverable before data is connected', () => {
    appSettingsState.url = '';
    orchestrationState.status = 'idle';
    orchestrationState.requestStatus = 'idle';
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Connect your training log' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Connect training data' }).getAttribute('href')).toBe(
      '/?page=setup'
    );
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

  it.each([
    ['loading', 'Loading your training'],
    ['error', 'Your training log could not be loaded'],
  ] as const)('distinguishes the %s state from analysis content', (status, heading) => {
    orchestrationState.status = status;
    orchestrationState.requestStatus = status;
    render(<App />);

    expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    expect(screen.queryByText('Overview content')).toBeNull();
  });

  it('distinguishes an empty connected log from a failed request', () => {
    visualizerState.visibleLiftIds = new Set();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'No training sets to analyze yet' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open Data & Setup' })).toBeTruthy();
  });

  it('keeps analysis visible while clearly identifying cached data', () => {
    Object.assign(orchestrationState, {
      requestStatus: 'error',
      isUsingCachedData: true,
      lastUpdatedAt: new Date('2026-08-02T14:30:00.000Z'),
    });
    render(<App />);

    expect(screen.getByRole('status').textContent).toContain('Showing saved training data');
    expect(screen.getByRole('status').textContent).toContain('latest refresh failed');
    expect(screen.getByText('Overview content')).toBeTruthy();
  });
});

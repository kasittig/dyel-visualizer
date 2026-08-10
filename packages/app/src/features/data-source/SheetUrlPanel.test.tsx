import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SheetUrlPanel } from './SheetUrlPanel';

vi.mock('../index-page/useIndexData', () => ({
  useIndexData: () => ({
    status: 'success',
    entries: [{ name: 'Casey', url: 'https://docs.google.com/spreadsheets/d/casey/pubhtml' }],
  }),
}));

const props = (overrides: Record<string, unknown> = {}) => ({
  showUrlPanel: false,
  url: 'https://docs.google.com/spreadsheets/d/casey/pubhtml',
  loaded: true,
  refreshStatus: 'success' as const,
  lastUpdatedAt: new Date('2026-08-02T14:30:00Z'),
  isUsingCachedData: false,
  invalidUrl: false,
  onUrlChange: vi.fn(),
  onForceOpen: vi.fn(),
  onCancel: vi.fn(),
  onRefresh: vi.fn(),
  mode: 'url' as const,
  onModeChange: vi.fn(),
  text: '',
  onTextChange: vi.fn(),
  ...overrides,
});

let mobileMatches = true;
let mediaListeners = new Set<() => void>();

describe('SheetUrlPanel mobile settings', () => {
  beforeEach(() => {
    mobileMatches = true;
    mediaListeners = new Set();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        get matches() {
          return mobileMatches;
        },
        addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
      })),
    });
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
  });

  afterEach(cleanup);

  it('shows a compact source identity and opens the accessible settings dialog', () => {
    const input = props();
    render(<SheetUrlPanel {...input} />);

    expect(screen.getByText('DYEL')).toBeTruthy();
    expect(screen.getAllByText('Casey').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(input.onForceOpen).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true);
    expect(screen.getByRole('heading', { name: 'Data settings' })).toBeTruthy();
  });

  it('keeps refresh, validation, team, and help actions inside settings', () => {
    const input = props({ showUrlPanel: true });
    render(<SheetUrlPanel {...input} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: /Refresh sheet data/ }));
    expect(input.onRefresh).toHaveBeenCalledOnce();
    expect(within(dialog).getByRole('link', { name: 'Validate training log' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'View team' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'Exercise alternatives' })).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'Help & conjugate method' })).toBeTruthy();
  });

  it('prevents duplicate refresh requests and announces progress', () => {
    const input = props({ showUrlPanel: true, refreshStatus: 'loading', lastUpdatedAt: null });
    render(<SheetUrlPanel {...input} />);
    const refresh = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Refreshing sheet data…',
    });

    expect((refresh as HTMLButtonElement).disabled).toBe(true);
    expect(within(screen.getByRole('dialog')).getByRole('status').textContent).toContain(
      'Refreshing sheet data…'
    );
    fireEvent.click(refresh);
    expect(input.onRefresh).not.toHaveBeenCalled();
  });

  it('shows a nearby refresh error with a retry action', () => {
    const input = props({ showUrlPanel: true, refreshStatus: 'error' });
    render(<SheetUrlPanel {...input} />);
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('alert').textContent).toContain('Refresh failed');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Try again' }));
    expect(input.onRefresh).toHaveBeenCalledOnce();
  });

  it.each([
    ['loading', 'Refreshing sheet data… Showing cached data meanwhile.'],
    ['error', 'Refresh failed. Showing cached data.'],
  ] as const)('labels cached data while refresh is %s', (refreshStatus, message) => {
    render(
      <SheetUrlPanel {...props({ showUrlPanel: true, refreshStatus, isUsingCachedData: true })} />
    );

    expect(within(screen.getByRole('dialog')).getByText(new RegExp(message))).toBeTruthy();
  });

  it('reports the last successful update time', () => {
    render(<SheetUrlPanel {...props({ showUrlPanel: true })} />);

    const status = within(screen.getByRole('dialog')).getByRole('status');
    expect(status.textContent).toContain('Updated');
    expect(status.querySelector('time')?.dateTime).toBe('2026-08-02T14:30:00.000Z');
  });

  it('closes without navigating and restores control to the working screen', () => {
    const input = props({ showUrlPanel: true });
    const startUrl = window.location.href;
    render(<SheetUrlPanel {...input} />);

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close data settings' })
    );

    expect(input.onCancel).toHaveBeenCalledOnce();
    expect(window.location.href).toBe(startUrl);
    expect(document.getElementById('data-source-settings')?.hasAttribute('open')).toBe(false);
  });

  it('gives an empty source one clear mobile action', () => {
    window.history.replaceState({}, '', '/dyel-visualizer/');
    render(<SheetUrlPanel {...props({ showUrlPanel: true, url: '', loaded: false })} />);

    expect(screen.getByText('No data source')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add source' })).toBeTruthy();
    expect(
      within(screen.getByRole('dialog'))
        .getByRole('link', { name: 'Exercise alternatives' })
        .getAttribute('href')
    ).toBe('/dyel-visualizer/alternatives');
  });

  it('offers exercise discovery in the desktop getting-started help area', () => {
    mobileMatches = false;
    window.history.replaceState({}, '', '/dyel-visualizer/');
    render(<SheetUrlPanel {...props({ showUrlPanel: true, url: '', loaded: false })} />);

    expect(screen.getByRole('link', { name: 'What is the conjugate method?' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'View team' }).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Explore exercise alternatives' }).getAttribute('href')
    ).toBe('/dyel-visualizer/alternatives');
  });

  it('switches between one mobile and desktop settings tree when the viewport changes', () => {
    render(<SheetUrlPanel {...props({ showUrlPanel: true })} />);

    expect(screen.getAllByLabelText('Sheet URL:')).toHaveLength(1);
    expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true);

    act(() => {
      mobileMatches = false;
      mediaListeners.forEach((listener) => listener());
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByLabelText('Sheet URL:')).toHaveLength(1);
  });

  it('separates product identity, data status, and desktop utility actions', () => {
    mobileMatches = false;
    window.history.replaceState({}, '', '/dyel-visualizer/');
    const input = props();
    render(<SheetUrlPanel {...input} />);

    expect(screen.getByRole('heading', { name: 'DYEL Visualizer' })).toBeTruthy();
    expect(screen.getByLabelText('Training data').textContent).toContain('Casey');
    expect(screen.getByLabelText('Training data').textContent).toContain('Ready');
    expect(screen.getByRole('button', { name: 'Change source' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Reload/ }));
    expect(input.onRefresh).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'View team' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Exercise alternatives' }).getAttribute('href')).toBe(
      '/dyel-visualizer/alternatives'
    );
  });

  it.each([
    ['desktop', false],
    ['mobile dialog', true],
  ])('keeps %s settings open when a focused text draft switches to Sheet URL', (_, mobile) => {
    mobileMatches = mobile;
    const onTextChange = vi.fn();
    const onModeChange = vi.fn();
    render(
      <SheetUrlPanel
        {...props({
          showUrlPanel: true,
          mode: 'text',
          text: 'comp squat 1rm 300lbs',
          onTextChange,
          onModeChange,
        })}
      />
    );
    const settings = mobile ? screen.getByRole('dialog') : screen.getByRole('banner');
    const textarea = within(settings).getByLabelText('Paste exercises (one per line):');
    const sheetUrlTab = within(settings).getByRole('tab', { name: 'Sheet URL' });

    fireEvent.focus(textarea);
    fireEvent.pointerDown(sheetUrlTab);
    fireEvent.blur(textarea, { relatedTarget: null });
    fireEvent.click(sheetUrlTab);
    fireEvent.pointerUp(sheetUrlTab);

    expect(onTextChange).toHaveBeenCalledWith('comp squat 1rm 300lbs', false);
    expect(onModeChange).toHaveBeenCalledWith('url');
    if (mobile) {
      expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true);
    }

    fireEvent.focus(textarea);
    fireEvent.blur(textarea, { relatedTarget: null });
    expect(onTextChange).toHaveBeenLastCalledWith('comp squat 1rm 300lbs', true);
  });
});

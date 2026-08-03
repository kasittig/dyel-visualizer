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
    expect(within(dialog).getByRole('link', { name: 'Help & conjugate method' })).toBeTruthy();
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
    render(<SheetUrlPanel {...props({ showUrlPanel: true, url: '', loaded: false })} />);

    expect(screen.getByText('No data source')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add source' })).toBeTruthy();
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
});

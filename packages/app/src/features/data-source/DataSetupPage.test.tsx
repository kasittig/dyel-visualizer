import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataSetupPage, type DataSetupPageProps } from './DataSetupPage';

vi.mock('../index-page/useIndexData', () => ({
  useIndexData: () => ({
    status: 'success',
    entries: [{ name: 'Alex', url: 'https://docs.google.com/alex' }],
  }),
}));

const props = (overrides: Partial<DataSetupPageProps> = {}): DataSetupPageProps => ({
  mode: 'url',
  url: '',
  text: '',
  status: 'idle',
  requestStatus: 'idle',
  requestError: null,
  invalidUrl: false,
  isUsingCachedData: false,
  lastUpdatedAt: null,
  onModeChange: vi.fn(),
  onUrlChange: vi.fn(),
  onTextChange: vi.fn(),
  onRefresh: vi.fn(),
  ...overrides,
});
afterEach(cleanup);

describe('DataSetupPage', () => {
  it.each([
    ['unconnected', props(), 'No training data connected'],
    [
      'loading',
      props({ url: 'https://docs.google.com/example', requestStatus: 'loading' }),
      'Validating & loading',
    ],
    [
      'cached refresh',
      props({
        url: 'https://docs.google.com/example',
        status: 'success',
        requestStatus: 'loading',
        isUsingCachedData: true,
      }),
      'Refreshing · cached data shown',
    ],
    [
      'connected',
      props({
        url: 'https://docs.google.com/example',
        status: 'success',
        requestStatus: 'success',
      }),
      'Connected',
    ],
  ])('shows the %s state', (_, input, expected) => {
    render(<DataSetupPage {...input} />);
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('gives unpublished sheets specific recovery instructions', () => {
    render(
      <DataSetupPage
        {...props({
          url: 'https://docs.google.com/example',
          requestStatus: 'error',
          requestError:
            'This sheet is not publicly accessible. Publish it first via File → Share → Publish to web.',
        })}
      />
    );
    expect(screen.getByRole('alert').textContent).toContain('Publish it first');
  });

  it('refreshes and disconnects a connected source', () => {
    const input = props({
      url: 'https://docs.google.com/example',
      status: 'success',
      requestStatus: 'success',
    });
    render(<DataSetupPage {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(input.onRefresh).toHaveBeenCalledOnce();
    expect(input.onUrlChange).toHaveBeenCalledWith('');
  });

  it('allows retrying the first failed request', () => {
    const input = props({
      url: 'https://docs.google.com/example',
      status: 'error',
      requestStatus: 'error',
      requestError: 'Network unavailable.',
    });
    render(<DataSetupPage {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading data' }));
    expect(input.onRefresh).toHaveBeenCalledOnce();
  });

  it('routes the example from a setup path back through the site root', () => {
    window.history.pushState({}, '', '/dyel-visualizer/setup');
    render(<DataSetupPage {...props()} />);
    expect(screen.getByRole('link', { name: 'Open the example' }).getAttribute('href')).toMatch(
      /^\/dyel-visualizer\/\?sheet=/
    );
    window.history.pushState({}, '', '/');
  });

  it('selects a spreadsheet directly from the team index', () => {
    const input = props();
    render(<DataSetupPage {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Alex' }));
    expect(input.onUrlChange).toHaveBeenCalledWith('https://docs.google.com/alex');
  });
});

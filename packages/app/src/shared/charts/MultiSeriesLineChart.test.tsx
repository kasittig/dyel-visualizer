import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MultiSeriesLineChart } from './MultiSeriesLineChart';

vi.mock('recharts', () => ({
  Line: () => null,
  Tooltip: () => null,
}));
vi.mock('./DateLineChart', () => ({
  DateLineChart: ({ summary, children }: { summary: string; children: React.ReactNode }) => (
    <div role="img" aria-label={summary}>
      {children}
    </div>
  ),
}));
vi.mock('../hooks', () => ({
  TOUCH_EXPLORATION_QUERY: '(pointer: coarse)',
  useMediaQuery: () => false,
}));

afterEach(cleanup);

describe('MultiSeriesLineChart', () => {
  it('keeps its accessible summary synchronized with legend visibility', () => {
    render(
      <MultiSeriesLineChart
        data={[]}
        unit="lbs"
        seriesKeys={['Squat', 'Bench']}
        tooltip={() => ({ key: 'value', detail: '' })}
        summary="Strength history."
      />
    );

    expect(screen.getByRole('img').getAttribute('aria-label')).toContain(
      'Visible series: Squat, Bench.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bench series, visible' }));
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Visible series: Squat.');
    fireEvent.click(screen.getByRole('button', { name: 'Squat series, visible' }));
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('All series are hidden.');
  });
});

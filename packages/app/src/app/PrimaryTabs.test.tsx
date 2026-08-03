import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PageTab } from './appTabs';
import { PrimaryTabs } from './PrimaryTabs';
import { PRIMARY_TABPANEL_ID } from './appTabA11y';

const tabs = [
  { id: 'sigma' as const, label: 'Σ', accessibleLabel: 'Overview' },
  { id: 'squat' as const, label: 'Squat' },
  { id: 'calculator' as const, label: 'Calculator' },
];

function Harness() {
  const [activeTab, setActiveTab] = useState<PageTab>('sigma');
  return (
    <>
      <PrimaryTabs tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
      <div
        id={PRIMARY_TABPANEL_ID}
        role="tabpanel"
        aria-label={
          tabs.find(({ id }) => id === activeTab)?.accessibleLabel ??
          tabs.find(({ id }) => id === activeTab)?.label
        }
      />
    </>
  );
}

afterEach(cleanup);

describe('PrimaryTabs', () => {
  it('associates the selected tab with a single tabpanel', () => {
    render(<Harness />);

    const overview = screen.getByRole('tab', { name: 'Overview' });
    const squat = screen.getByRole('tab', { name: 'Squat' });
    expect(overview.getAttribute('aria-selected')).toBe('true');
    expect(overview.getAttribute('aria-controls')).toBe(PRIMARY_TABPANEL_ID);
    expect(overview.tabIndex).toBe(0);
    expect(squat.getAttribute('aria-selected')).toBe('false');
    expect(squat.tabIndex).toBe(-1);
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toBeDefined();
  });

  it.each([
    ['ArrowRight', 'Squat'],
    ['ArrowLeft', 'Calculator'],
    ['End', 'Calculator'],
  ])('activates and focuses the expected tab with %s', (key, expectedName) => {
    render(<Harness />);
    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();

    fireEvent.keyDown(overview, { key });

    const expected = screen.getByRole('tab', { name: expectedName });
    expect(document.activeElement).toBe(expected);
    expect(expected.getAttribute('aria-selected')).toBe('true');
  });
});

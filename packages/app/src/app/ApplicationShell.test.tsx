import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApplicationShell } from './ApplicationShell';

describe('ApplicationShell', () => {
  afterEach(cleanup);

  it('keeps every top-level destination available around any shell state', () => {
    render(
      <ApplicationShell page={null}>
        <p>Loading…</p>
      </ApplicationShell>
    );

    const desktop = screen.getAllByRole('navigation', { name: 'Primary navigation' })[0]!;
    expect(within(desktop).getByRole('link', { name: 'Training Tools' })).toBeTruthy();
    expect(
      within(desktop).getByRole('link', { name: 'My Training' }).getAttribute('aria-current')
    ).toBe('page');
    expect(within(desktop).getByRole('link', { name: 'Data & Setup' })).toBeTruthy();
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('supports arrow, Home, and End focus movement in desktop navigation', () => {
    render(<ApplicationShell page="tools">Content</ApplicationShell>);
    const desktop = screen.getAllByRole('navigation', { name: 'Primary navigation' })[0]!;
    const tools = within(desktop).getByRole('link', { name: 'Training Tools' });
    const training = within(desktop).getByRole('link', { name: 'My Training' });
    const learn = within(desktop).getByRole('link', { name: 'Learn' });

    tools.focus();
    fireEvent.keyDown(tools, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(training);
    fireEvent.keyDown(training, { key: 'End' });
    expect(document.activeElement).toBe(learn);
    fireEvent.keyDown(learn, { key: 'Home' });
    expect(document.activeElement).toBe(tools);
  });

  it('uses compact labels in mobile navigation and marks legacy pages active', () => {
    render(<ApplicationShell page="validator">Content</ApplicationShell>);
    const mobile = screen.getAllByRole('navigation', { name: 'Primary navigation' })[1]!;
    expect(within(mobile).getByRole('link', { name: 'Tools' })).toBeTruthy();
    expect(within(mobile).getByRole('link', { name: 'Setup' }).getAttribute('aria-current')).toBe(
      'page'
    );
  });
});

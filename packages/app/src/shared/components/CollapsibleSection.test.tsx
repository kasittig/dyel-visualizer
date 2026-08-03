import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollapsibleSection } from './CollapsibleSection';

const storageKey = 'dyel:collapsibleSection:test:section';

const renderSection = () =>
  render(
    <CollapsibleSection label="Test section" persistenceId="test:section">
      <div>Section contents</div>
    </CollapsibleSection>
  );

describe('CollapsibleSection', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('defaults to expanded and persists the collapsed state', () => {
    renderSection();

    const toggle = screen.getByRole('button', { name: /test section/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Section contents').parentElement?.hidden).toBe(true);
    expect(localStorage.getItem(storageKey)).toBe('false');
  });

  it('associates its expanded trigger and visible region', () => {
    renderSection();

    const trigger = screen.getByRole('button', { name: 'Test section' });
    const region = screen.getByRole('region', { name: 'Test section' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(region.id);
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(region.hidden).toBe(false);
  });

  it('exposes the collapsed state and hides the controlled region', () => {
    renderSection();
    const trigger = screen.getByRole('button', { name: 'Test section' });

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const region = document.getElementById(trigger.getAttribute('aria-controls')!);
    expect(region?.hidden).toBe(true);
  });

  it('restores a persisted collapsed state', () => {
    localStorage.setItem(storageKey, 'false');
    renderSection();

    expect(screen.getByText('Section contents').parentElement?.hidden).toBe(true);
    expect(
      screen.getByRole('button', { name: /test section/i }).getAttribute('aria-expanded')
    ).toBe('false');
  });

  it('isolates state between section identifiers', () => {
    localStorage.setItem(storageKey, 'false');
    render(
      <CollapsibleSection label="Other section" persistenceId="other-page:section">
        <div>Other contents</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Other contents')).toBeTruthy();
  });

  it.each([
    ['lift tabs', 'visualizer:squat:performance', 'visualizer:bench:performance'],
    ['lift panels', 'visualizer:squat:diagnostics', 'visualizer:squat:variation-radar'],
    ['overview panels', 'visualizer:sigma:overview', 'visualizer:sigma:total-volume'],
    ['calculators', 'visualizer:calculator:rep', 'visualizer:calculator:strength-score'],
  ])('persists %s independently across remounts', (_, firstId, secondId) => {
    const view = render(
      <>
        <CollapsibleSection label="First" persistenceId={firstId}>
          <div>First contents</div>
        </CollapsibleSection>
        <CollapsibleSection label="Second" persistenceId={secondId}>
          <div>Second contents</div>
        </CollapsibleSection>
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /First/ }));
    view.unmount();
    render(
      <>
        <CollapsibleSection label="First" persistenceId={firstId}>
          <div>First contents</div>
        </CollapsibleSection>
        <CollapsibleSection label="Second" persistenceId={secondId}>
          <div>Second contents</div>
        </CollapsibleSection>
      </>
    );

    expect(screen.getByText('First contents').parentElement?.hidden).toBe(true);
    expect(screen.getByText('Second contents').parentElement?.hidden).toBe(false);
  });

  it.each(['not-json', 'null', '"false"', '{}'])(
    'falls back to expanded for invalid stored value %s',
    (storedValue) => {
      localStorage.setItem(storageKey, storedValue);
      renderSection();

      expect(screen.getByText('Section contents')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: /test section/i }).getAttribute('aria-expanded')
      ).toBe('true');
    }
  );
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CollapsibleSection } from './CollapsibleSection';

afterEach(cleanup);

describe('CollapsibleSection', () => {
  it('associates its expanded trigger and visible region', () => {
    render(<CollapsibleSection label="Diagnostics">Details</CollapsibleSection>);

    const trigger = screen.getByRole('button', { name: 'Diagnostics' });
    const region = screen.getByRole('region', { name: 'Diagnostics' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(region.id);
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(region.hidden).toBe(false);
  });

  it('exposes the collapsed state and hides the controlled region', () => {
    render(<CollapsibleSection label="Diagnostics">Details</CollapsibleSection>);
    const trigger = screen.getByRole('button', { name: 'Diagnostics' });

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const region = document.getElementById(trigger.getAttribute('aria-controls')!);
    expect(region?.hidden).toBe(true);
  });
});

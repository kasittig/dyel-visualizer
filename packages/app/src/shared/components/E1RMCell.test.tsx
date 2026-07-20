import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { E1RMCell } from './E1RMCell';

afterEach(cleanup);

describe('E1RMCell', () => {
  it.each([
    ['projectedDisplay is null', { actualDisplay: '300', projectedDisplay: null }],
    ['projectedDisplay equals actualDisplay', { actualDisplay: '300', projectedDisplay: '300' }],
    [
      'projectedDisplay and familyRecentDisplay both equal actualDisplay',
      {
        actualDisplay: '300',
        projectedDisplay: '300',
        projectedFamilyRecentDisplay: '300',
      },
    ],
  ])('has no toggle affordance when %s', (_, props) => {
    render(<E1RMCell {...props} />);

    expect(screen.getByText('300')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('toggles between actualDisplay and projectedDisplay when clicked', () => {
    render(<E1RMCell actualDisplay="300" projectedDisplay="320" sourceLabel="test label" />);

    // Initially shows actualDisplay
    expect(screen.getByText('300')).toBeDefined();

    const button = screen.getByRole('button');

    // Click to toggle to projected
    fireEvent.click(button);
    expect(screen.getByText('320')).toBeDefined();

    // Click again to toggle back
    fireEvent.click(button);
    expect(screen.getByText('300')).toBeDefined();
  });

  it('shows icon with title matching sourceLabel only when displaying projected value', () => {
    render(
      <E1RMCell actualDisplay="300" projectedDisplay="320" sourceLabel="calculated from profile" />
    );

    // Icon is always rendered (to avoid layout shift) but hidden initially
    const icon = screen.getByText('*');
    expect(icon.getAttribute('title')).toBeNull();
    expect(icon.style.visibility).toBe('hidden');

    // Click to toggle to projected
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Icon should now be visible with correct title
    expect(icon.getAttribute('title')).toBe('calculated from profile');
    expect(icon.style.visibility).toBe('visible');

    // Click to toggle back to actual
    fireEvent.click(button);

    // Icon should be hidden again
    expect(icon.getAttribute('title')).toBeNull();
    expect(icon.style.visibility).toBe('hidden');
  });

  it('uses controlled mode when both showProjected and onToggle are provided', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <E1RMCell
        actualDisplay="300"
        projectedDisplay="320"
        sourceLabel="controlled source"
        showProjected={false}
        onToggle={onToggle}
      />
    );

    // Initially shows actualDisplay because showProjected=false
    expect(screen.getByText('300')).toBeDefined();

    // Click calls onToggle instead of internal state update
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Rerender with showProjected=true
    rerender(
      <E1RMCell
        actualDisplay="300"
        projectedDisplay="320"
        sourceLabel="controlled source"
        showProjected={true}
        onToggle={onToggle}
      />
    );

    // Now shows projectedDisplay
    expect(screen.getByText('320')).toBeDefined();

    // Icon should be visible and titled
    const icon = screen.getByText('*');
    expect(icon.getAttribute('title')).toBe('controlled source');
    expect(icon.style.visibility).toBe('visible');
  });

  it('renders both projections side-by-side when both present and differing', () => {
    render(
      <E1RMCell
        actualDisplay="300"
        projectedDisplay="312"
        projectedFamilyRecentDisplay="318"
        sourceLabel="baseline source"
        familyRecentSourceLabel="family-recent source"
      />
    );

    // Initially shows actual
    expect(screen.getByText('300')).toBeDefined();

    // Toggle to projected
    fireEvent.click(screen.getByRole('button'));

    // Should show both values with labels in separate titled spans
    expect(
      screen.getByText(
        (content, element) =>
          element?.getAttribute('title') === 'baseline source' && content.includes('312')
      )
    ).toBeDefined();
    expect(
      screen.getByText(
        (content, element) =>
          element?.getAttribute('title') === 'family-recent source' && content.includes('318')
      )
    ).toBeDefined();

    // Icon should be visible without redundant title (info is in the spans)
    const icon = screen.getByText('*');
    expect(icon.getAttribute('title')).toBeNull();
    expect(icon.style.visibility).toBe('visible');

    // Toggle back to actual
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('300')).toBeDefined();
  });

  it('collapses to single projection when both present but equal', () => {
    render(
      <E1RMCell
        actualDisplay="300"
        projectedDisplay="315"
        projectedFamilyRecentDisplay="315"
        sourceLabel="baseline source"
        familyRecentSourceLabel="family-recent source"
      />
    );

    // Initially shows actual
    expect(screen.getByText('300')).toBeDefined();

    // Toggle to projected
    fireEvent.click(screen.getByRole('button'));

    // Should show single value (not combined), and button shows baseline projection
    const buttonText = screen.getByRole('button').textContent;
    expect(buttonText).toContain('315');
    expect(buttonText).not.toContain('comp');
    expect(buttonText).not.toContain('recent');

    // Icon should be visible with baseline tooltip
    const icon = screen.getByText('*');
    expect(icon.getAttribute('title')).toBe('baseline source');
    expect(icon.style.visibility).toBe('visible');
  });

  it('renders single projection when only family-recent present', () => {
    render(
      <E1RMCell
        actualDisplay="300"
        projectedDisplay={null}
        projectedFamilyRecentDisplay="318"
        familyRecentSourceLabel="family-recent source"
      />
    );

    // Initially shows actual
    expect(screen.getByText('300')).toBeDefined();

    // Toggle to projected
    fireEvent.click(screen.getByRole('button'));

    // Should show family-recent value
    const buttonText = screen.getByRole('button').textContent;
    expect(buttonText).toContain('318');

    // Icon should be visible with family-recent tooltip
    const icon = screen.getByText('*');
    expect(icon.getAttribute('title')).toBe('family-recent source');
    expect(icon.style.visibility).toBe('visible');
  });

  it.each([
    [
      'only baseline differs from actual',
      {
        actualDisplay: '300',
        projectedDisplay: '312',
        projectedFamilyRecentDisplay: null,
        sourceLabel: 'baseline source',
      },
    ],
    [
      'only family-recent differs from actual',
      {
        actualDisplay: '300',
        projectedDisplay: null,
        projectedFamilyRecentDisplay: '318',
        familyRecentSourceLabel: 'family-recent source',
      },
    ],
  ])('maintains single-projection behavior when %s', (_, props) => {
    render(<E1RMCell {...props} />);

    // Should have toggle affordance
    expect(screen.getByRole('button')).toBeDefined();

    // Toggle to show projected
    fireEvent.click(screen.getByRole('button'));

    // Should show single projected value without combined labels
    const button = screen.getByRole('button');
    expect(button.textContent).not.toContain('comp');
    expect(button.textContent).not.toContain('recent');

    // Toggle back
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('300')).toBeDefined();
  });
});

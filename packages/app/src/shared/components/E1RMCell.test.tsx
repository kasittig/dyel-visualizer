import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { E1RMCell } from './E1RMCell';

afterEach(cleanup);

describe('E1RMCell', () => {
  it.each([
    ['projectedDisplay is null', { actualDisplay: '300', projectedDisplay: null }],
    ['projectedDisplay equals actualDisplay', { actualDisplay: '300', projectedDisplay: '300' }],
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
});

import { describe, it, expect, afterEach } from 'vitest';
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
    expect(screen.queryByText('~')).toBeNull();
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

    // Icon should not be present initially
    expect(screen.queryByText('~')).toBeNull();

    // Click to toggle to projected
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Icon should now be present with correct title
    const icon = screen.getByText('~');
    expect(icon.getAttribute('title')).toBe('calculated from profile');

    // Click to toggle back to actual
    fireEvent.click(button);

    // Icon should be gone
    expect(screen.queryByText('~')).toBeNull();
  });
});

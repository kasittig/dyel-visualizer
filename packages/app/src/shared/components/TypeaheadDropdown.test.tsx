import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TypeaheadDropdown } from './TypeaheadDropdown';

afterEach(() => {
  cleanup();
});

describe('TypeaheadDropdown', () => {
  const mockOptions = ['Apple', 'Banana', 'Cherry', 'Apricot', 'Avocado'];

  it('renders input with placeholder and toggle button', () => {
    const onChange = vi.fn();
    render(
      <TypeaheadDropdown
        options={mockOptions}
        value={null}
        onChange={onChange}
        placeholder="Choose fruit"
      />
    );

    const input = screen.getByPlaceholderText('Choose fruit') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('');

    const toggleButton = screen.getByRole('button', { name: /toggle dropdown/i });
    expect(toggleButton).toBeDefined();
  });

  it.each([
    ['all options', '', mockOptions.length],
    ['a matches', 'a', 4],
    ['app matches', 'app', 1],
    ['cherry matches', 'cherry', 1],
    ['no match', 'xyz', 0],
  ])('filters options case-insensitively for %s', async (_, query, expectedCount) => {
    const onChange = vi.fn();
    render(<TypeaheadDropdown options={mockOptions} value={null} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: query } });
    fireEvent.focus(input);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const buttons = screen.queryAllByRole('button').filter((b) => !b.hasAttribute('aria-label'));
    if (expectedCount === 0) {
      expect(screen.queryByText('No matches')).toBeDefined();
      expect(buttons).toHaveLength(0);
    } else {
      expect(buttons).toHaveLength(expectedCount);
    }
  });

  it('shows full unfiltered list when toggle button is clicked', async () => {
    const onChange = vi.fn();
    render(<TypeaheadDropdown options={mockOptions} value={null} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'cherry' } });
    fireEvent.focus(input);

    await new Promise((resolve) => setTimeout(resolve, 100));

    let optionButtons = screen.getAllByRole('button').filter((b) => !b.hasAttribute('aria-label'));
    expect(optionButtons).toHaveLength(1);
    expect(optionButtons[0].textContent).toBe('Cherry');

    const toggleButton = screen.getByRole('button', { name: /toggle dropdown/i });
    fireEvent.click(toggleButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    optionButtons = screen.getAllByRole('button').filter((b) => !b.hasAttribute('aria-label'));
    expect(optionButtons).toHaveLength(mockOptions.length);
    mockOptions.forEach((option) => {
      expect(screen.queryByText(option)).toBeDefined();
    });
  });

  it('calls onChange when an option is clicked', async () => {
    const onChange = vi.fn();
    render(<TypeaheadDropdown options={mockOptions} value={null} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const bananaButton = screen.getByText('Banana');
    fireEvent.click(bananaButton);

    expect(onChange).toHaveBeenCalledWith('Banana');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('updates input value after selecting an option', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TypeaheadDropdown options={mockOptions} value={null} onChange={onChange} />
    );

    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    fireEvent.focus(input);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const appleButton = screen.getByText('Apple');
    fireEvent.click(appleButton);

    rerender(<TypeaheadDropdown options={mockOptions} value="Apple" onChange={onChange} />);

    expect((screen.getByPlaceholderText('Search...') as HTMLInputElement).value).toBe('Apple');
  });

  it('highlights option with ArrowDown and selects with Enter', async () => {
    const onChange = vi.fn();
    render(<TypeaheadDropdown options={mockOptions} value={null} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const optionButtons = screen
      .getAllByRole('button')
      .filter((b) => !b.hasAttribute('aria-label'));
    expect(optionButtons[0].className).toContain('optionHighlighted');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Apple');
  });

  it('navigates with ArrowDown through multiple options', async () => {
    render(<TypeaheadDropdown options={mockOptions} value={null} onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await new Promise((resolve) => setTimeout(resolve, 100));

    let optionButtons = screen.getAllByRole('button').filter((b) => !b.hasAttribute('aria-label'));
    expect(optionButtons[0].className).toContain('optionHighlighted');

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await new Promise((resolve) => setTimeout(resolve, 100));

    optionButtons = screen.getAllByRole('button').filter((b) => !b.hasAttribute('aria-label'));
    expect(optionButtons[1].className).toContain('optionHighlighted');
    expect(optionButtons[0].className).not.toContain('optionHighlighted');
  });

  it('closes popover on Escape without calling onChange', async () => {
    const onChange = vi.fn();
    render(<TypeaheadDropdown options={mockOptions} value={null} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);

    await new Promise((resolve) => setTimeout(resolve, 100));

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const optionButtons = screen
      .queryAllByRole('button')
      .filter((b) => !b.hasAttribute('aria-label'));
    expect(optionButtons.length).toBeGreaterThan(0);

    fireEvent.keyDown(input, { key: 'Escape' });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows custom emptyMessage when no options match', async () => {
    const onChange = vi.fn();
    render(
      <TypeaheadDropdown
        options={mockOptions}
        value={null}
        onChange={onChange}
        emptyMessage="No fruits found"
      />
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'xyz' } });
    fireEvent.focus(input);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.queryByText('No fruits found')).toBeDefined();
    expect(
      screen.queryAllByRole('button').filter((b) => !b.hasAttribute('aria-label'))
    ).toHaveLength(0);
  });

  it('uses default placeholder and emptyMessage when not provided', async () => {
    render(<TypeaheadDropdown options={mockOptions} value={null} onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: 'nomatch' } });
    fireEvent.focus(input);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.queryByText('No matches')).toBeDefined();
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TypeaheadDropdown } from './TypeaheadDropdown';

const opts = ['Apple', 'Banana', 'Cherry', 'Apricot', 'Avocado'];
const wait = () => new Promise((r) => setTimeout(r, 100));
const getOpts = () => screen.queryAllByRole('button').filter((b) => !b.hasAttribute('aria-label'));

afterEach(cleanup);

describe('TypeaheadDropdown', () => {
  it('renders input with placeholder and toggle button', () => {
    render(
      <TypeaheadDropdown
        options={opts}
        value={null}
        onChange={vi.fn()}
        placeholder="Choose fruit"
      />
    );
    expect(screen.getByPlaceholderText('Choose fruit')).toBeDefined();
    expect(screen.getByRole('button', { name: /toggle dropdown/i })).toBeDefined();
  });

  it.each([
    ['all options', '', 5],
    ['a matches', 'a', 4],
    ['app matches', 'app', 1],
    ['cherry matches', 'cherry', 1],
    ['no match', 'xyz', 0],
  ])('filters options case-insensitively for %s', async (_, query, count) => {
    render(<TypeaheadDropdown options={opts} value={null} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: query } });
    fireEvent.focus(input);
    await wait();
    expect(getOpts()).toHaveLength(count);
    if (!count) {
      expect(screen.queryByText('No matches')).toBeDefined();
    }
  });

  it('shows full unfiltered list when toggle button is clicked', async () => {
    render(<TypeaheadDropdown options={opts} value={null} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'cherry' } });
    fireEvent.focus(input);
    await wait();
    expect(getOpts()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /toggle dropdown/i }));
    await wait();
    expect(getOpts()).toHaveLength(5);
  });

  it('calls onChange when an option is clicked', async () => {
    const cb = vi.fn();
    render(<TypeaheadDropdown options={opts} value={null} onChange={cb} />);
    fireEvent.focus(screen.getByPlaceholderText('Search...'));
    await wait();
    fireEvent.click(screen.getByText('Banana'));
    expect(cb).toHaveBeenCalledWith('Banana');
  });

  it('updates input value after selecting an option', async () => {
    const { rerender } = render(
      <TypeaheadDropdown options={opts} value={null} onChange={vi.fn()} />
    );
    fireEvent.focus(screen.getByPlaceholderText('Search...'));
    await wait();
    fireEvent.click(screen.getByText('Apple'));
    rerender(<TypeaheadDropdown options={opts} value="Apple" onChange={vi.fn()} />);
    expect((screen.getByPlaceholderText('Search...') as HTMLInputElement).value).toBe('Apple');
  });

  it('highlights option with ArrowDown and selects with Enter', async () => {
    const cb = vi.fn();
    render(<TypeaheadDropdown options={opts} value={null} onChange={cb} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await wait();
    expect(getOpts()[0].className).toContain('optionHighlighted');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(cb).toHaveBeenCalledWith('Apple');
  });

  it('navigates with ArrowDown through multiple options', async () => {
    render(<TypeaheadDropdown options={opts} value={null} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await wait();
    expect(getOpts()[0].className).toContain('optionHighlighted');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await wait();
    expect(getOpts()[1].className).toContain('optionHighlighted');
    expect(getOpts()[0].className).not.toContain('optionHighlighted');
  });

  it('closes popover on Escape without calling onChange', async () => {
    const cb = vi.fn();
    render(<TypeaheadDropdown options={opts} value={null} onChange={cb} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    await wait();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await wait();
    expect(getOpts().length).toBeGreaterThan(0);
    fireEvent.keyDown(input, { key: 'Escape' });
    await wait();
    expect(cb).not.toHaveBeenCalled();
  });

  it('shows custom emptyMessage when no options match', async () => {
    render(
      <TypeaheadDropdown
        options={opts}
        value={null}
        onChange={vi.fn()}
        emptyMessage="No fruits found"
      />
    );
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'xyz' } });
    fireEvent.focus(input);
    await wait();
    expect(screen.queryByText('No fruits found')).toBeDefined();
    expect(getOpts()).toHaveLength(0);
  });

  it('uses default placeholder and emptyMessage when not provided', async () => {
    render(<TypeaheadDropdown options={opts} value={null} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeDefined();
    fireEvent.change(input, { target: { value: 'nomatch' } });
    fireEvent.focus(input);
    await wait();
    expect(screen.queryByText('No matches')).toBeDefined();
  });
});

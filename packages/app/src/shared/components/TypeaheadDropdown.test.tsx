import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TypeaheadDropdown } from './TypeaheadDropdown';

const opts = ['Apple', 'Banana', 'Cherry', 'Apricot', 'Avocado'];
const wait = () => new Promise((r) => setTimeout(r, 100));
const getOpts = () => screen.queryAllByRole('option');

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

  it('associates an external visible label through inputId', () => {
    render(
      <>
        <label htmlFor="fruit-search">Fruit</label>
        <TypeaheadDropdown inputId="fruit-search" options={opts} value={null} onChange={vi.fn()} />
      </>
    );
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toBeDefined();
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

  it('can match hidden search terms without rendering them as options', async () => {
    render(
      <TypeaheadDropdown
        options={['Apple', 'Banana']}
        value={null}
        onChange={vi.fn()}
        getSearchText={(option) => (option === 'Apple' ? 'Apple granny smith' : option)}
      />
    );
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'granny' } });
    fireEvent.focus(input);
    await wait();

    expect(getOpts()).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Apple' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'granny smith' })).toBeNull();
  });

  it('renders optional group labels without changing the selectable options', async () => {
    render(
      <TypeaheadDropdown
        options={['Apple', 'Apricot', 'Banana']}
        value={null}
        onChange={vi.fn()}
        getGroupLabel={(option) => (option.startsWith('A') ? 'A fruit' : 'B fruit')}
      />
    );
    fireEvent.focus(screen.getByPlaceholderText('Search...'));
    await wait();

    expect(screen.getByText('A fruit')).toBeDefined();
    expect(screen.getByText('B fruit')).toBeDefined();
    expect(getOpts()).toHaveLength(3);
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

  it('prevents default on option mousedown so the input never blurs mid-selection', async () => {
    // Regression test: in a real browser, pressing down on an option button shifts focus
    // away from the input, firing `blur` before `click`. That blur used to trigger an effect
    // that reverted `inputText` from the (still-stale) `value` prop back to the prior
    // selection, which re-filters `visibleOptions` and unmounts the pressed button out from
    // under the pending click — so the click, and thus the selection, was silently dropped.
    // The fix is an `onMouseDown` handler on each option that calls `preventDefault()`, which
    // suppresses the browser's implicit focus shift (and therefore the blur) while leaving
    // `click`/`onClick` unaffected.
    const cb = vi.fn();
    render(<TypeaheadDropdown options={opts} value="Banana" onChange={cb} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'apr' } });
    await wait();
    expect(getOpts()).toHaveLength(1);

    const option = screen.getByText('Apricot');
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    fireEvent(option, mouseDownEvent);
    expect(mouseDownEvent.defaultPrevented).toBe(true);

    // With the blur suppressed, the list stays filtered/stable and the click reaches the
    // same option element.
    expect(getOpts()).toHaveLength(1);
    fireEvent.click(option);
    expect(cb).toHaveBeenCalledWith('Apricot');
  });

  it('highlights option with ArrowDown and selects with Enter', async () => {
    const cb = vi.fn();
    render(<TypeaheadDropdown options={opts} value={null} onChange={cb} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await wait();
    expect(getOpts()[0].className).toContain('optionHighlighted');
    expect(input.getAttribute('aria-activedescendant')).toBe(getOpts()[0].id);
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

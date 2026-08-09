import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExerciseAlternativesPage } from './ExerciseAlternativesPage';

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

const chooseExercise = async (query: string, optionName: string) => {
  const search = screen.getByRole('combobox', { name: 'Exercise' });
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: query } });
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
};

describe('ExerciseAlternativesPage', () => {
  it('renders the standalone initial state without requiring a training sheet', () => {
    render(<ExerciseAlternativesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Exercise alternatives' })).toBeDefined();
    expect(screen.getByText(/no training sheet is required/i)).toBeDefined();
    expect(screen.getByRole('region', { name: 'Find an alternative' })).toBeDefined();
    expect(screen.getByText(/choose an exercise to see the issues/i)).toBeDefined();
  });

  it.each([
    ['/alternatives', '/'],
    ['/dyel-visualizer/alternatives', '/dyel-visualizer/'],
  ])('links back to the site root from %s', (path, expected) => {
    window.history.pushState({}, '', path);
    render(<ExerciseAlternativesPage />);

    expect(
      screen.getByRole('link', { name: /back to dyel visualizer/i }).getAttribute('href')
    ).toBe(expected);
  });

  it('recommends adjustments before replacements for a Swiss-bar grip that feels too small', async () => {
    render(<ExerciseAlternativesPage />);
    await chooseExercise('Swiss-Bar', 'Swiss-Bar Bench Press');

    expect(screen.getByRole('radio', { name: 'Grip or handle' })).toBeDefined();
    expect(screen.queryByRole('radio', { name: 'Loading range' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Grip or handle' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Grip feels too small' }));

    const adjustments = screen.getByRole('region', { name: 'Adjust this exercise' });
    const replacements = screen.getByRole('region', { name: 'Try another exercise' });
    expect(
      within(adjustments).getByRole('heading', { name: 'Use a wider handle pair' })
    ).toBeDefined();
    expect(
      within(replacements).getByRole('heading', { name: 'Dumbbell Bench Press' })
    ).toBeDefined();
    expect(
      adjustments.compareDocumentPosition(replacements) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getAllByText('Why it helps')).toHaveLength(3);
    expect(screen.getAllByText('What stays similar')).toHaveLength(3);
    expect(screen.getAllByText('What changes')).toHaveLength(3);
  });

  it('puts Band-Resisted Push-Up first when a push-up cannot add enough resistance', async () => {
    render(<ExerciseAlternativesPage />);
    await chooseExercise('Push-Up', 'Push-Up');
    fireEvent.click(screen.getByRole('radio', { name: 'Loading range' }));
    fireEvent.click(screen.getByRole('radio', { name: 'I cannot add enough resistance' }));

    const resultHeadings = screen.getAllByRole('heading', { level: 4 });
    expect(resultHeadings[0].textContent).toBe('Band-Resisted Push-Up');
    expect(screen.getByText(/band tension increasing toward lockout/i)).toBeDefined();
  });

  it('offers spine-loading alternatives for a back squat without making a zero-load claim', async () => {
    render(<ExerciseAlternativesPage />);
    await chooseExercise('Back Squat', 'Back Squat');
    fireEvent.click(screen.getByRole('radio', { name: 'Spinal loading' }));

    expect(screen.getByRole('heading', { name: 'Belt Squat' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Leg Press' })).toBeDefined();
    expect(screen.getAllByText(/does not eliminate spinal demand/i)).toHaveLength(2);
  });

  it('resets category, direction, and results when the exercise changes', async () => {
    render(<ExerciseAlternativesPage />);
    await chooseExercise('Swiss-Bar', 'Swiss-Bar Bench Press');
    fireEvent.click(screen.getByRole('radio', { name: 'Grip or handle' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Grip feels too small' }));
    expect(screen.getByRole('heading', { name: 'Recommendations' })).toBeDefined();

    await chooseExercise('Push-Up', 'Push-Up');
    expect(screen.queryByRole('heading', { name: 'Recommendations' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Loading range' })).not.toHaveProperty(
      'checked',
      true
    );
    expect(screen.queryByRole('radio', { name: 'Grip feels too small' })).toBeNull();
  });

  it('resets the direction and results when the category changes', async () => {
    render(<ExerciseAlternativesPage />);
    await chooseExercise('Push-Up', 'Push-Up');
    fireEvent.click(screen.getByRole('radio', { name: 'Loading range' }));
    fireEvent.click(screen.getByRole('radio', { name: 'I cannot add enough resistance' }));
    expect(screen.getByRole('heading', { name: 'Recommendations' })).toBeDefined();

    fireEvent.click(screen.getByRole('radio', { name: 'Range of motion' }));
    expect(screen.queryByRole('heading', { name: 'Recommendations' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Range of motion feels too short' })).toBeDefined();
  });

  it('shows a useful no-match state', async () => {
    render(<ExerciseAlternativesPage />);
    const search = screen.getByRole('combobox', { name: 'Exercise' });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'not a real movement' } });

    expect(await screen.findByText('No exercises match your search')).toBeDefined();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('lists each canonical exercise once while aliases remain searchable', async () => {
    render(<ExerciseAlternativesPage />);
    const search = screen.getByRole('combobox', { name: 'Exercise' });
    fireEvent.focus(search);

    expect(screen.getAllByRole('option', { name: 'Push-Up' })).toHaveLength(1);
    expect(screen.queryByRole('option', { name: 'pushup' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'press-up' })).toBeNull();

    fireEvent.change(search, { target: { value: 'press-up' } });
    expect(await screen.findByRole('option', { name: 'Push-Up' })).toBeDefined();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('groups canonical exercises by powerlifting family', async () => {
    render(<ExerciseAlternativesPage />);
    fireEvent.focus(screen.getByRole('combobox', { name: 'Exercise' }));

    const squat = screen.getByText('Squat');
    const bench = screen.getByText('Bench');
    const deadlift = screen.getByText('Deadlift');
    expect(squat.compareDocumentPosition(bench) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bench.compareDocumentPosition(deadlift) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('supports keyboard-only exercise, category, and direction selection', async () => {
    render(<ExerciseAlternativesPage />);
    const search = screen.getByRole('combobox', { name: 'Exercise' });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'Swiss-Bar Bench Press' } });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    const category = screen.getByRole('radio', { name: 'Grip or handle' });
    category.focus();
    fireEvent.keyDown(category, { key: ' ' });
    fireEvent.click(category);
    const direction = screen.getByRole('radio', { name: 'Grip feels too small' });
    direction.focus();
    fireEvent.keyDown(direction, { key: ' ' });
    fireEvent.click(direction);

    expect(screen.getByRole('heading', { name: 'Recommendations' })).toBeDefined();
    expect(screen.getByText('3 recommendations available.')).toBeDefined();
  });

  it('clears the complete flow with Start over', async () => {
    render(<ExerciseAlternativesPage />);
    await chooseExercise('Push-Up', 'Push-Up');
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect((screen.getByRole('combobox', { name: 'Exercise' }) as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText(/choose an exercise to see the issues/i)).toBeDefined();
  });
});

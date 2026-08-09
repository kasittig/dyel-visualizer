import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExerciseAlternativesPage } from './ExerciseAlternativesPage';

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('ExerciseAlternativesPage shell', () => {
  it('renders independently of a training sheet', () => {
    render(<ExerciseAlternativesPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Exercise alternatives' })).toBeDefined();
    expect(screen.getByText(/no training sheet is required/i)).toBeDefined();
    expect(screen.getByRole('region', { name: 'Find an alternative' })).toBeDefined();
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
});

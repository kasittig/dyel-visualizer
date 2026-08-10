import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LearnPage } from './LearnPage';

describe('LearnPage', () => {
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it.each([
    ['local root', '/learn', '/?page=conjugate', '/?page=tools&tool=alternatives'],
    [
      'GitHub Pages root',
      '/dyel-visualizer/learn',
      '/dyel-visualizer/?page=conjugate',
      '/dyel-visualizer/?page=tools&tool=alternatives',
    ],
  ])(
    'offers data-independent, base-safe guides from the %s',
    (_, path, conjugate, alternatives) => {
      window.history.pushState({}, '', path);
      render(<LearnPage />);

      expect(screen.getByRole('navigation', { name: 'Learning guides' })).toBeTruthy();
      expect(
        screen.getByRole('link', { name: /Reading your training data/ }).getAttribute('href')
      ).toContain('?page=metrics');
      expect(
        screen
          .getByRole('link', { name: /Understanding the conjugate method/ })
          .getAttribute('href')
      ).toBe(conjugate);
      expect(
        screen.getByRole('link', { name: /Choose an exercise alternative/ }).getAttribute('href')
      ).toBe(alternatives);
    }
  );
});

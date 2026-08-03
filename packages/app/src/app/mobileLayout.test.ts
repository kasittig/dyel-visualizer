import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = (...path: string[]) =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', ...path), 'utf8');

describe('mobile layout contract', () => {
  it.each([320, 375, 390, 430])('covers the %ipx acceptance viewport', (width) => {
    expect(width).toBeLessThanOrEqual(640);
    expect(css('index.css')).toContain('@media (max-width: 640px)');
    expect(css('app', 'App.module.css')).toContain('overflow-x: auto');
  });

  it.each([
    ['rep', 'features/calculator/RepCalculator.module.css'],
    ['strength score', 'features/calculator/StrengthScoreCalculator.module.css'],
  ])('stacks the %s calculator with touch-sized fields', (_, path) => {
    const source = css(...path.split('/'));

    expect(source).toMatch(/@media \(max-width: 640px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(source).toMatch(/@media \(max-width: 640px\)[\s\S]*min-height: var\(--touch-target\)/);
    expect(source).toMatch(/@media \(max-width: 640px\)[\s\S]*font-size: 1rem/);
  });

  it('removes the root border and supplies phone gutters', () => {
    expect(css('index.css')).toMatch(
      /@media \(max-width: 640px\)[\s\S]*--page-gutter: 1rem[\s\S]*#root[\s\S]*border-inline: 0/
    );
  });
});

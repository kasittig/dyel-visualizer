import { describe, it, expect, afterEach } from 'vitest';
import { resolvePage, siteRootPath } from './pageRouting';

function setLocation(url: string) {
  window.history.pushState({}, '', url);
}

describe('pageRouting', () => {
  afterEach(() => {
    setLocation('/');
  });

  it.each([
    ['root', '/', null],
    ['query param', '/?page=team', 'team'],
    ['bare page path', '/team', 'team'],
    ['bare page path with trailing slash', '/team/', 'team'],
    ['coach alias', '/coach', 'coach'],
    ['two-segment team/summary', '/team/summary', 'team-summary'],
    ['two-segment with trailing slash', '/team/summary/', 'team-summary'],
    ['GH Pages subpath two-segment', '/dyel-visualizer/team/summary', 'team-summary'],
    ['alternatives query param', '/?page=alternatives', 'alternatives'],
    ['alternatives path', '/alternatives', 'alternatives'],
    ['GH Pages alternatives path', '/dyel-visualizer/alternatives', 'alternatives'],
    ['unknown path', '/foo/bar', null],
  ])('resolvePage: %s', (_, url, expected) => {
    setLocation(url);
    expect(resolvePage()).toBe(expected);
  });

  it.each([
    ['root', '/', '/'],
    ['root with subpath', '/dyel-visualizer/', '/dyel-visualizer/'],
    ['bare page path', '/team', '/'],
    ['bare page path with trailing slash', '/team/', '/'],
    ['two-segment team/summary', '/team/summary', '/'],
    ['two-segment with trailing slash', '/team/summary/', '/'],
    ['GH Pages subpath single-segment', '/dyel-visualizer/team', '/dyel-visualizer/'],
    ['GH Pages subpath two-segment', '/dyel-visualizer/team/summary', '/dyel-visualizer/'],
    ['alternatives path', '/alternatives', '/'],
    ['GH Pages alternatives path', '/dyel-visualizer/alternatives', '/dyel-visualizer/'],
  ])('siteRootPath: %s', (_, url, expected) => {
    setLocation(url);
    expect(siteRootPath()).toBe(expected);
  });
});

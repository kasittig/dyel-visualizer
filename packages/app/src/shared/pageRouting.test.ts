import { describe, it, expect, afterEach } from 'vitest';
import {
  destinationForPage,
  destinationHref,
  pageHref,
  resolvePage,
  siteRootPath,
} from './pageRouting';

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
    ['universal tools destination', '/?page=tools', 'tools'],
    ['explicit training destination', '/?page=my-training', 'my-training'],
    ['setup destination', '/?page=setup', 'setup'],
    ['learn destination', '/learn', 'learn'],
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

  it.each([
    ['root', null, 'my-training'],
    ['legacy alternatives', 'alternatives', 'tools'],
    ['legacy coach', 'coach', 'team'],
    ['validation', 'validator', 'setup'],
    ['conjugate guide', 'conjugate', 'learn'],
  ])('maps %s to its primary destination', (_, page, expected) => {
    expect(destinationForPage(page)).toBe(expected);
  });

  it('builds destination links without dropping sheet state', () => {
    setLocation('/dyel-visualizer/?sheet=abc&page=team');
    expect(destinationHref('tools')).toBe('/dyel-visualizer/?sheet=abc&page=tools');
    expect(destinationHref('my-training')).toBe('/dyel-visualizer/?sheet=abc');
  });

  it('builds page links without dropping source state', () => {
    setLocation('/dyel-visualizer/learn?sheet=abc&mode=url&page=learn');
    expect(pageHref('tools', { tool: 'alternatives' })).toBe(
      '/dyel-visualizer/?sheet=abc&mode=url&page=tools&tool=alternatives'
    );
  });
});

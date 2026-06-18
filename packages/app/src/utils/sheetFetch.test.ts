import { describe, it, expect } from 'vitest';
import { sheetCsvUrl, publishedCsvUrl, csvFetchError } from './sheetFetch';

describe('sheetCsvUrl', () => {
  it('builds a pub URL for published sheets', () => {
    const url = sheetCsvUrl({ id: 'PUBID', published: true });
    expect(url.endsWith('/d/e/PUBID/pub?output=csv')).toBe(true);
  });

  it('builds an export URL with default gid for regular sheets', () => {
    const url = sheetCsvUrl({ id: 'SHEETID', published: false });
    expect(url.endsWith('/d/SHEETID/export?format=csv&gid=0')).toBe(true);
  });

  it('passes a custom gid through for regular sheets', () => {
    const url = sheetCsvUrl({ id: 'SHEETID', published: false }, '123');
    expect(url.endsWith('/d/SHEETID/export?format=csv&gid=123')).toBe(true);
  });

  it('ignores gid for published sheets', () => {
    expect(sheetCsvUrl({ id: 'PUBID', published: true }, '999')).toBe(
      sheetCsvUrl({ id: 'PUBID', published: true })
    );
  });
});

describe('publishedCsvUrl', () => {
  it('targets the published-CSV endpoint', () => {
    expect(publishedCsvUrl('ABC').endsWith('/d/e/ABC/pub?output=csv')).toBe(true);
  });
});

describe('csvFetchError', () => {
  it('returns null for a 200 text/csv response', () => {
    expect(csvFetchError(200, 'text/csv; charset=utf-8')).toBeNull();
  });

  it('flags 404 as not found', () => {
    expect(csvFetchError(404, '')).toMatch(/not found/i);
  });

  it('flags 401 and 403 as not publicly accessible', () => {
    expect(csvFetchError(401, '')).toMatch(/not publicly accessible/i);
    expect(csvFetchError(403, '')).toMatch(/not publicly accessible/i);
  });

  it('flags 400 with a publish-to-web hint', () => {
    expect(csvFetchError(400, '')).toMatch(/published to the web/i);
  });

  it('flags other non-2xx statuses generically', () => {
    expect(csvFetchError(500, '')).toMatch(/HTTP 500/);
  });

  it('flags a 200 non-CSV response as not publicly accessible (login redirect)', () => {
    expect(csvFetchError(200, 'text/html')).toMatch(/not publicly accessible/i);
  });
});

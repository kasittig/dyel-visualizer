import { describe, it, expect } from 'vitest';
import { sheetCsvUrl, publishedCsvUrl, csvFetchError } from './sheetFetch';

describe('sheetCsvUrl & publishedCsvUrl', () => {
  it('builds export and publication URL structures accurately', () => {
    expect(
      sheetCsvUrl({ id: 'PUBID', published: true }).endsWith('/d/e/PUBID/pub?output=csv')
    ).toBe(true);
    expect(
      sheetCsvUrl({ id: 'SHEETID', published: false }).endsWith(
        '/d/SHEETID/export?format=csv&gid=0'
      )
    ).toBe(true);
    expect(
      sheetCsvUrl({ id: 'SHEETID', published: false }, '123').endsWith(
        '/d/SHEETID/export?format=csv&gid=123'
      )
    ).toBe(true);
    expect(sheetCsvUrl({ id: 'PUBID', published: true }, '999')).toBe(
      sheetCsvUrl({ id: 'PUBID', published: true })
    );
    expect(publishedCsvUrl('ABC').endsWith('/d/e/ABC/pub?output=csv')).toBe(true);
  });
});

describe('csvFetchError', () => {
  it('evaluates status codes and content type filters safely', () => {
    expect(csvFetchError(200, 'text/csv; charset=utf-8')).toBeNull();
    expect(csvFetchError(404, '')).toMatch(/not found/i);
    expect(csvFetchError(401, '')).toMatch(/not publicly accessible/i);
    expect(csvFetchError(403, '')).toMatch(/not publicly accessible/i);
    expect(csvFetchError(400, '')).toMatch(/published to the web/i);
    expect(csvFetchError(500, '')).toMatch(/HTTP 500/);
    expect(csvFetchError(200, 'text/html')).toMatch(/not publicly accessible/i);
  });
});

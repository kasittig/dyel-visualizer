import type { SheetRef } from './sheetRef';

// During dev the Vite proxy (sheetsProxyPlugin) forwards to Google and follows redirects
// server-side, avoiding CORS. In production we hit Google directly (published sheets only).
const SHEETS_BASE = import.meta.env.DEV
  ? '/sheets-proxy/spreadsheets'
  : 'https://docs.google.com/spreadsheets';

export const INDEX_SHEET_ID =
  '2PACX-1vTmiDdFL3yDqnm-sK2KvbljacO6Rq9KltzzoOJY1aFu6B2tWPejLDH4XqKW0su0j1IFSI7iA4IGmGbU';

const NOT_PUBLIC_MESSAGE =
  'This sheet is not publicly accessible. Publish it first via File → Share → Publish to web.';

export function publishedCsvUrl(id: string): string {
  return `${SHEETS_BASE}/d/e/${id}/pub?output=csv`;
}

export function sheetCsvUrl(ref: SheetRef, gid = '0'): string {
  return ref.published
    ? publishedCsvUrl(ref.id)
    : `${SHEETS_BASE}/d/${ref.id}/export?format=csv&gid=${gid}`;
}

/**
 * Maps an HTTP status + content-type to a user-facing error message, or `null` when the
 * response is a successful CSV. Centralizes the chain previously duplicated across the
 * conjugate-data and validation fetch paths.
 */
export function csvFetchError(status: number, contentType: string): string | null {
  if (status === 404) {
    return 'Sheet not found. Check that the URL is correct.';
  }
  if (status === 401 || status === 403) {
    return NOT_PUBLIC_MESSAGE;
  }
  if (status === 400) {
    return 'Could not fetch this sheet. Make sure the sheet is published to the web as CSV (File → Share → Publish to web).';
  }
  if (status < 200 || status >= 300) {
    return `Unexpected error (HTTP ${status}).`;
  }
  if (!contentType.includes('text/csv')) {
    return NOT_PUBLIC_MESSAGE;
  }
  return null;
}

export async function fetchSheetCsv(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  const error = csvFetchError(res.status, res.headers.get('content-type') ?? '');
  if (error) {
    throw new Error(error);
  }
  return res.text();
}

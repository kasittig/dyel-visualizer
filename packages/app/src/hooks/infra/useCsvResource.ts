import { useState, useEffect } from 'react';
import { fetchSheetCsv } from '../../utils/sheetFetch';

export type CsvResource<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

/**
 * Shared fetch-CSV-and-parse state machine. Fetches `url` (skipping when null), maps the
 * response through `fetchSheetCsv`, and feeds the body to `parse`. Aborts in-flight requests
 * when the url changes or the component unmounts.
 */
export function useCsvResource<T>(url: string | null, parse: (csv: string) => T): CsvResource<T> {
  const [state, setState] = useState<CsvResource<T>>({ status: 'idle' });

  useEffect(() => {
    if (!url) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });
    const controller = new AbortController();

    fetchSheetCsv(url, controller.signal)
      .then((csv) => setState({ status: 'success', data: parse(csv) }))
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        setState({ status: 'error', message: String(err.message) });
      });

    return () => controller.abort();
    // `parse` is intentionally omitted: callers pass a stable module-level parser, and the
    // fetch is keyed entirely by `url`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return url ? state : { status: 'idle' };
}

import { useState, useEffect } from 'react';
import type { RawInput } from '@dyel/api';
import type { InputMode } from '../../app/appTabs';
import { extractSheetRef } from './sheetRef';
import { sheetCsvUrl, fetchSheetCsv } from './sheetFetch';
import { buildRawInput } from './rawInput';

export function useResolvedRawInput(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number
): {
  status: 'idle' | 'loading' | 'success' | 'error';
  raw: RawInput[];
  lastUpdatedAt: Date | null;
  error: string | null;
} {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [raw, setRaw] = useState<RawInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<{ sheetKey: string; at: Date } | null>(null);

  useEffect(() => {
    if (inputMode === 'text') {
      if (!pastedText.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus('idle');
        setRaw([]);
        setError(null);
        return;
      }
      try {
        setError(null);
        setStatus('loading');
        setRaw([buildRawInput('text', pastedText)]);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setRaw([]);
        setError(err instanceof Error ? err.message : 'Could not read the pasted training data.');
      }
      return;
    }

    const ref = extractSheetRef(url.trim());
    if (!ref) {
      setStatus('idle');
      setRaw([]);
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);
    const controller = new AbortController();

    fetchSheetCsv(sheetCsvUrl(ref, '0'), controller.signal)
      .then((csv) => {
        setRaw([buildRawInput('url', csv)]);
        setLastUpdate({ sheetKey: url, at: new Date() });
        setStatus('success');
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setStatus('error');
        setRaw([]);
        setError(err instanceof Error ? err.message : 'Could not load this training data.');
      });

    return () => controller.abort();
  }, [inputMode, url, pastedText, refreshToken]);

  return {
    status,
    raw,
    lastUpdatedAt: lastUpdate?.sheetKey === url ? lastUpdate.at : null,
    error,
  };
}

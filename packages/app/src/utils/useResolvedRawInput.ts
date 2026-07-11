import { useState, useEffect } from 'react';
import type { RawInput } from '@dyel/api';
import type { InputMode } from './appTabs';
import { extractSheetRef } from './sheetRef';
import { sheetCsvUrl, fetchSheetCsv } from './sheetFetch';
import { buildRawInput } from './rawInput';

export function useResolvedRawInput(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number
): { status: 'idle' | 'loading' | 'success' | 'error'; raw: RawInput[] } {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [raw, setRaw] = useState<RawInput[]>([]);

  useEffect(() => {
    if (inputMode === 'text') {
      if (!pastedText.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus('idle');

        setRaw([]);
        return;
      }
      try {
        setStatus('loading');
        const input = buildRawInput('text', pastedText);
        setRaw([input]);
        setStatus('success');
      } catch {
        setStatus('error');

        setRaw([]);
      }
      return;
    }

    const sheetRef = extractSheetRef(url.trim());
    if (!sheetRef) {
      setStatus('idle');

      setRaw([]);
      return;
    }

    setStatus('loading');
    const controller = new AbortController();
    fetchSheetCsv(sheetCsvUrl(sheetRef, '0'), controller.signal)
      .then((csv) => {
        const input = buildRawInput('url', csv);
        setRaw([input]);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setStatus('error');

        setRaw([]);
      });

    return () => controller.abort();
  }, [inputMode, url, pastedText, refreshToken]);

  return { status, raw };
}

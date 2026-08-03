import { useMemo, useEffect } from 'react';
import type { AthleteContext, PipelineModel } from '@dyel/api';
import { buildPipelineModel, parseTextData } from '@dyel/api';
import type { InputMode } from './appTabs';
import { extractSheetRef } from '../features/data-source/sheetRef';
import {
  serializeSheetCache,
  deserializeSheetCache,
  type CachedSheetData,
} from '../features/data-source/sheetCacheUtils';
import { useResolvedRawInput } from '../features/data-source/useResolvedRawInput';
import { useLocalStorageState } from '../shared/hooks/useLocalStorageState';

export interface PipelineOrchestrationReturn {
  status: 'idle' | 'loading' | 'success' | 'error';
  requestStatus: 'idle' | 'loading' | 'success' | 'error';
  lastUpdatedAt: Date | null;
  model: PipelineModel | null;
  invalidUrl: boolean;
  textValidation: { hasText: boolean; isValid: boolean };
}

export function usePipelineOrchestration(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number,
  athleteBase: Pick<AthleteContext, 'sex' | 'bodyweight'>
): PipelineOrchestrationReturn {
  const ref = useMemo(() => extractSheetRef(url), [url]);
  const {
    status: rawStatus,
    raw,
    lastUpdatedAt,
  } = useResolvedRawInput(inputMode, url, pastedText, refreshToken);
  const [cache, setCache] = useLocalStorageState<CachedSheetData | null>(
    'dyel:sheetDataCache',
    null,
    {
      serialize: (v) => (v ? serializeSheetCache(v) : 'null'),
      deserialize: (s) => (s === 'null' ? null : deserializeSheetCache(s)),
    }
  );

  const { status: pStatus, model } = useMemo(() => {
    if (['idle', 'loading', 'error'].includes(rawStatus)) {
      return { status: rawStatus, model: null };
    }
    try {
      return {
        status: 'success' as const,
        model: buildPipelineModel(raw, athleteBase),
      };
    } catch {
      return { status: 'error' as const, model: null };
    }
  }, [raw, athleteBase, rawStatus]);

  useEffect(() => {
    if (pStatus === 'success' && raw.length && ref && inputMode === 'url') {
      setCache({ sheetKey: url, raw });
    }
  }, [pStatus, raw, ref, url, inputMode, setCache]);

  const effRaw = useMemo(
    () =>
      rawStatus === 'success' || inputMode === 'text'
        ? raw
        : cache && cache.sheetKey === url
          ? cache.raw
          : raw,
    [rawStatus, raw, cache, url, inputMode]
  );

  const effModel = useMemo(() => {
    if (pStatus === 'success') {
      return model;
    }
    if (['idle', 'loading', 'error'].includes(rawStatus) && effRaw !== raw && effRaw.length) {
      try {
        return buildPipelineModel(effRaw, athleteBase);
      } catch {
        return null;
      }
    }
    return null;
  }, [pStatus, model, rawStatus, effRaw, raw, athleteBase]);

  return {
    status: pStatus === 'success' || effModel !== null ? 'success' : pStatus,
    requestStatus: rawStatus,
    lastUpdatedAt,
    model: effModel,
    invalidUrl: url.length > 0 && !ref,
    textValidation: useMemo(() => {
      const trimmed = pastedText.trim();
      return {
        hasText: inputMode === 'text' && !!trimmed.length,
        isValid: inputMode === 'text' && !!trimmed.length && parseTextData(pastedText).length > 0,
      };
    }, [inputMode, pastedText]),
  };
}

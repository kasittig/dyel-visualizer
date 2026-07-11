import { useMemo, useEffect } from 'react';
import type { AthleteContext, PipelineModel } from '@dyel/api';
import { buildPipelineModel, parseTextData } from '@dyel/api';
import type { InputMode } from './appTabs';
import { extractSheetRef } from '../features/data-source/sheetRef';
import {
  serializeSheetCache,
  deserializeSheetCache,
} from '../features/data-source/sheetCacheUtils';
import type { CachedSheetData } from '../features/data-source/sheetCacheUtils';
import { useResolvedRawInput } from '../features/data-source/useResolvedRawInput';
import { useLocalStorageState } from '../shared/hooks/useLocalStorageState';

export interface PipelineOrchestrationReturn {
  status: 'idle' | 'loading' | 'success' | 'error';
  model: PipelineModel | null;
  invalidUrl: boolean;
  textValidation: { hasText: boolean; isValid: boolean };
}

export function usePipelineOrchestration(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number,
  athlete: AthleteContext
): PipelineOrchestrationReturn {
  const sheetRef = useMemo(() => extractSheetRef(url), [url]);
  const invalidUrl = url.length > 0 && !sheetRef;

  // Resolve raw input (CSV fetch or pasted text)
  const { status: rawStatus, raw } = useResolvedRawInput(inputMode, url, pastedText, refreshToken);

  // Cache resolved raw input for instant restore on revisit
  const [cachedSheetData, setCachedSheetData] = useLocalStorageState<CachedSheetData | null>(
    'dyel:sheetDataCache',
    null,
    {
      serialize: (v) => (v === null ? 'null' : serializeSheetCache(v)),
      deserialize: (raw) => (raw === 'null' ? null : deserializeSheetCache(raw)),
    }
  );

  // Compute pipeline model from resolved raw input
  const { status: pipelineStatus, model } = useMemo(() => {
    if (rawStatus === 'idle' || rawStatus === 'loading') {
      return { status: rawStatus as Extract<typeof rawStatus, 'idle' | 'loading'>, model: null };
    }
    if (rawStatus === 'error') {
      return { status: 'error', model: null };
    }

    // status === 'success'
    try {
      const pipelineModel = buildPipelineModel(raw, athlete);
      return { status: 'success', model: pipelineModel };
    } catch {
      return { status: 'error', model: null };
    }
  }, [raw, athlete, rawStatus]);

  // Cache resolved raw input for instant restore on revisit
  useEffect(() => {
    if (pipelineStatus === 'success' && raw.length > 0 && sheetRef && inputMode === 'url') {
      setCachedSheetData({ sheetKey: url, raw });
    }
  }, [pipelineStatus, raw, sheetRef, url, inputMode, setCachedSheetData]);

  // Use cached raw if available for URL mode and current fetch hasn't completed yet
  const effectiveRaw = useMemo(() => {
    if (rawStatus === 'success' || rawStatus === 'loading' || inputMode === 'text') {
      return raw;
    }
    if (cachedSheetData && cachedSheetData.sheetKey === url) {
      return cachedSheetData.raw;
    }
    return raw;
  }, [rawStatus, raw, cachedSheetData, url, inputMode]);

  // Recompute model if using cached raw
  const effectiveModel = useMemo(() => {
    if (pipelineStatus === 'success') {
      return model;
    }
    if (
      (rawStatus === 'idle' || rawStatus === 'loading') &&
      effectiveRaw !== raw &&
      effectiveRaw.length > 0
    ) {
      try {
        return buildPipelineModel(effectiveRaw, athlete);
      } catch {
        return null;
      }
    }
    return null;
  }, [pipelineStatus, model, rawStatus, effectiveRaw, raw, athlete]);

  let effectiveStatus: 'idle' | 'loading' | 'success' | 'error';
  if (pipelineStatus === 'success') {
    effectiveStatus = 'success';
  } else if (effectiveModel !== null) {
    // Use cached model if pipeline hasn't completed yet
    effectiveStatus = 'success';
  } else if (pipelineStatus === 'error') {
    effectiveStatus = 'error';
  } else {
    // idle or loading
    effectiveStatus = pipelineStatus as 'idle' | 'loading';
  }

  // Handle text mode with parseTextData for validation messaging
  const textValidation = useMemo(() => {
    if (inputMode !== 'text' || pastedText.trim().length === 0) {
      return { hasText: false, isValid: false };
    }
    const textPairs = parseTextData(pastedText);
    return { hasText: true, isValid: textPairs.length > 0 };
  }, [inputMode, pastedText]);

  return {
    status: effectiveStatus,
    model: effectiveModel,
    invalidUrl,
    textValidation,
  };
}

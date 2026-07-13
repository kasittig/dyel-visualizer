import { useMemo, useEffect } from 'react';
import type { AthleteContext, PipelineModel, RawInput } from '@dyel/api';
import { buildPipelineModel, parseTextData, resolveAutoDeadliftStance } from '@dyel/api';
import type { InputMode, DeadliftStancePreference } from './appTabs';
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
  model: PipelineModel | null;
  invalidUrl: boolean;
  textValidation: { hasText: boolean; isValid: boolean };
}

function buildResolvedModel(
  raw: RawInput[],
  athleteBase: Pick<AthleteContext, 'sex' | 'bodyweight'>,
  deadliftStance: DeadliftStancePreference | null
): PipelineModel {
  const provisional: AthleteContext = {
    ...athleteBase,
    deadliftStance: deadliftStance ?? 'sumo',
  };
  const model = buildPipelineModel(raw, provisional);
  if (deadliftStance !== null) {
    return model;
  }
  const resolved = resolveAutoDeadliftStance(model);
  return resolved === provisional.deadliftStance
    ? model
    : buildPipelineModel(raw, { ...athleteBase, deadliftStance: resolved });
}

export function usePipelineOrchestration(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number,
  athleteBase: Pick<AthleteContext, 'sex' | 'bodyweight'>,
  deadliftStance: DeadliftStancePreference | null
): PipelineOrchestrationReturn {
  const ref = useMemo(() => extractSheetRef(url), [url]);
  const invalidUrl = url.length > 0 && !ref;

  const { status: rawStatus, raw } = useResolvedRawInput(inputMode, url, pastedText, refreshToken);
  const [cache, setCache] = useLocalStorageState<CachedSheetData | null>(
    'dyel:sheetDataCache',
    null,
    {
      serialize: (v) => (v === null ? 'null' : serializeSheetCache(v)),
      deserialize: (str) => (str === 'null' ? null : deserializeSheetCache(str)),
    }
  );

  const { status: pStatus, model } = useMemo((): {
    status: 'idle' | 'loading' | 'success' | 'error';
    model: PipelineModel | null;
  } => {
    if (rawStatus === 'idle' || rawStatus === 'loading' || rawStatus === 'error') {
      return { status: rawStatus, model: null };
    }
    try {
      return { status: 'success', model: buildResolvedModel(raw, athleteBase, deadliftStance) };
    } catch {
      return { status: 'error', model: null };
    }
  }, [raw, athleteBase, deadliftStance, rawStatus]);

  useEffect(() => {
    if (pStatus === 'success' && raw.length > 0 && ref && inputMode === 'url') {
      setCache({ sheetKey: url, raw });
    }
  }, [pStatus, raw, ref, url, inputMode, setCache]);

  const effRaw = useMemo(() => {
    if (rawStatus === 'success' || rawStatus === 'loading' || inputMode === 'text') {
      return raw;
    }
    if (cache && cache.sheetKey === url) {
      return cache.raw;
    }
    return raw;
  }, [rawStatus, raw, cache, url, inputMode]);

  const effModel = useMemo(() => {
    if (pStatus === 'success') {
      return model;
    }
    if ((rawStatus === 'idle' || rawStatus === 'loading') && effRaw !== raw && effRaw.length > 0) {
      try {
        return buildResolvedModel(effRaw, athleteBase, deadliftStance);
      } catch {
        return null;
      }
    }
    return null;
  }, [pStatus, model, rawStatus, effRaw, raw, athleteBase, deadliftStance]);

  const textValidation = useMemo(() => {
    if (inputMode !== 'text' || pastedText.trim().length === 0) {
      return { hasText: false, isValid: false };
    }
    return { hasText: true, isValid: parseTextData(pastedText).length > 0 };
  }, [inputMode, pastedText]);

  return {
    status: pStatus === 'success' || effModel !== null ? 'success' : pStatus,
    model: effModel,
    invalidUrl,
    textValidation,
  };
}

import { useState, useEffect } from 'react';
import { runPipeline } from '@dyel/pipeline';
import type { NormalizationModel } from '@dyel/pipeline';
import type { InputMode } from '../../utils/appUtils';
import { extractSheetRef } from '../../utils/appUtils';
import { sheetCsvUrl, fetchSheetCsv } from '../../utils/sheetFetch';
import { buildRawInput, PLACEHOLDER_ATHLETE } from '../../utils/rawInputUtils';

const DEFAULT_MODEL: NormalizationModel = {
  fittedAt: Date.now(),
  baseline: {},
  variantFactor: {},
  addlWtOffset: {},
};

export function usePipelineRepCalculator(
  inputMode: InputMode,
  url: string,
  pastedText: string,
  refreshToken: number
): NormalizationModel {
  const [model, setModel] = useState<NormalizationModel>(DEFAULT_MODEL);

  useEffect(() => {
    if (inputMode === 'text') {
      if (!pastedText.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModel(DEFAULT_MODEL);
        return;
      }
      try {
        const raw = buildRawInput('text', pastedText);
        const result = runPipeline([raw], [], PLACEHOLDER_ATHLETE, {});
        setModel(result.model);
      } catch {
        setModel(DEFAULT_MODEL);
      }
      return;
    }

    const sheetRef = extractSheetRef(url.trim());
    if (!sheetRef) {
      setModel(DEFAULT_MODEL);
      return;
    }

    const controller = new AbortController();
    fetchSheetCsv(sheetCsvUrl(sheetRef, '0'), controller.signal)
      .then((csv) => {
        const raw = buildRawInput('url', csv);
        const result = runPipeline([raw], [], PLACEHOLDER_ATHLETE, {});
        setModel(result.model);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setModel(DEFAULT_MODEL);
      });

    return () => controller.abort();
  }, [inputMode, url, pastedText, refreshToken]);

  return model;
}

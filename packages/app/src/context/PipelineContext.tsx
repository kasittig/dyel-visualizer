import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { PipelineModel, AthleteContext } from '@dyel/pipeline';
import { runPipelineModel } from '@dyel/pipeline';
import type { InputMode } from '../utils/appUtils';
import { useResolvedRawInput } from '../utils/rawInputUtils';

interface PipelineContextValue {
  status: 'idle' | 'loading' | 'success' | 'error';
  model: PipelineModel | null;
}

const pipelineContext = createContext<PipelineContextValue | undefined>(undefined);

/**
 * PipelineProvider component that orchestrates raw input resolution and pipeline model computation.
 *
 * @param props Provider props
 * @param props.inputMode Input mode ('url' or 'text')
 * @param props.url Sheet URL (when inputMode is 'url')
 * @param props.pastedText Pasted text input (when inputMode is 'text')
 * @param props.refreshToken Refresh trigger token (increment to force re-fetch)
 * @param props.athlete Athlete context (sex, bodyweight, deadliftStance). Should be memoized by caller to avoid unnecessary recomputations.
 * @param props.children Child components
 */
export function PipelineProvider({
  inputMode,
  url,
  pastedText,
  refreshToken,
  athlete,
  children,
}: {
  inputMode: InputMode;
  url: string;
  pastedText: string;
  refreshToken: number;
  athlete: AthleteContext;
  children: ReactNode;
}) {
  const { status: rawStatus, raw } = useResolvedRawInput(inputMode, url, pastedText, refreshToken);

  const { status: modelStatus, model } = useMemo((): PipelineContextValue => {
    if (rawStatus === 'idle' || rawStatus === 'loading') {
      return { status: rawStatus as Extract<typeof rawStatus, 'idle' | 'loading'>, model: null };
    }
    if (rawStatus === 'error') {
      return { status: 'error', model: null };
    }

    // status === 'success'
    try {
      const pipelineModel = runPipelineModel(raw, athlete);
      return { status: 'success', model: pipelineModel };
    } catch {
      return { status: 'error', model: null };
    }
  }, [raw, athlete, rawStatus]);

  const contextValue: PipelineContextValue = useMemo(
    () => ({ status: modelStatus, model }),
    [modelStatus, model]
  );

  return <pipelineContext.Provider value={contextValue}>{children}</pipelineContext.Provider>;
}

/**
 * Hook to consume the pipeline model from context.
 * Must be used inside a PipelineProvider.
 *
 * @returns The pipeline context value containing status and model
 * @throws Error if called outside a PipelineProvider
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to this context and colocation is intentional
export function usePipelineModel(): PipelineContextValue {
  const context = useContext(pipelineContext);
  if (!context) {
    throw new Error('usePipelineModel must be used inside a PipelineProvider');
  }
  return context;
}

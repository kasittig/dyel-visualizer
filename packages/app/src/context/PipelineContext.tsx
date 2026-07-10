import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { PipelineModel } from '@dyel/api';

interface PipelineContextValue {
  status: 'idle' | 'loading' | 'success' | 'error';
  model: PipelineModel | null;
}

const pipelineContext = createContext<PipelineContextValue | undefined>(undefined);

/**
 * PipelineProvider component that passes pre-computed pipeline model and status through context.
 *
 * The app (App.tsx) is responsible for calling useResolvedRawInput() and runPipelineModel()
 * directly to compute the status and model. This provider simply makes those values available
 * to child components via context, eliminating the double-fetch that occurred when both
 * useResolvedRawInput() and a separate useConjugateData() hook were running independently.
 *
 * @param props Provider props
 * @param props.status Pipeline status: 'idle' | 'loading' | 'success' | 'error'
 * @param props.model Computed PipelineModel (null if not in 'success' state)
 * @param props.children Child components
 */
export function PipelineProvider({
  status,
  model,
  children,
}: {
  status: 'idle' | 'loading' | 'success' | 'error';
  model: PipelineModel | null;
  children: ReactNode;
}) {
  const contextValue: PipelineContextValue = useMemo(() => ({ status, model }), [status, model]);

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

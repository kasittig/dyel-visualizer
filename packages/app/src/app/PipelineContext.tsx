import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { PipelineModel } from '@dyel/api';

export type PipelineStatus = 'idle' | 'loading' | 'success' | 'error';

interface PipelineContextValue {
  status: PipelineStatus;
  model: PipelineModel | null;
}

const pipelineContext = createContext<PipelineContextValue | undefined>(undefined);

export function PipelineProvider({
  status,
  model,
  children,
}: {
  status: PipelineStatus;
  model: PipelineModel | null;
  children: ReactNode;
}) {
  const contextValue = useMemo(() => ({ status, model }), [status, model]);
  return <pipelineContext.Provider value={contextValue}>{children}</pipelineContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to this context and colocation is intentional
export function usePipelineModel(): PipelineContextValue {
  const context = useContext(pipelineContext);
  if (!context) {
    throw new Error('usePipelineModel must be used inside a PipelineProvider');
  }
  return context;
}

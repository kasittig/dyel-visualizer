/* eslint-disable react-refresh/only-export-components */
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/App.tsx';
import { ErrorBoundary } from './shared/components/ErrorBoundary.tsx';
import { resolvePage } from './shared/pageRouting.ts';

const ConjugateInfoPage = lazy(() =>
  import('./features/conjugate-info/ConjugateInfoPage.tsx').then((m) => ({
    default: m.ConjugateInfoPage,
  }))
);

const IndexPage = lazy(() =>
  import('./features/index-page/IndexPage.tsx').then((m) => ({ default: m.IndexPage }))
);

const ValidatorPage = lazy(() =>
  import('./features/validation/ValidatorPage.tsx').then((m) => ({ default: m.ValidatorPage }))
);

const PipelineValidationPage = lazy(() =>
  import('./features/validation/PipelineValidationPage.tsx').then((m) => ({
    default: m.PipelineValidationPage,
  }))
);

const TeamViewPage = lazy(() =>
  import('./features/team-view/TeamViewPage.tsx').then((m) => ({ default: m.TeamViewPage }))
);

const TeamSummaryPage = lazy(() =>
  import('./features/team-summary/TeamSummaryPage.tsx').then((m) => ({
    default: m.TeamSummaryPage,
  }))
);

function resolvePageComponent(page: string | null) {
  if (page === 'conjugate') {
    return (
      <Suspense>
        <ConjugateInfoPage />
      </Suspense>
    );
  }
  if (page === 'index') {
    return (
      <Suspense>
        <IndexPage />
      </Suspense>
    );
  }
  if (page === 'validator') {
    return (
      <Suspense>
        <ValidatorPage />
      </Suspense>
    );
  }
  if (page === 'pipeline-validation') {
    return (
      <Suspense>
        <PipelineValidationPage />
      </Suspense>
    );
  }
  if (page === 'team' || page === 'coach') {
    return (
      <Suspense>
        <TeamViewPage />
      </Suspense>
    );
  }
  if (page === 'team-summary') {
    return (
      <Suspense>
        <TeamSummaryPage />
      </Suspense>
    );
  }
  if (page === null) {
    return <App />;
  }
  return <p>Page not found.</p>;
}

const page = resolvePage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{resolvePageComponent(page)}</ErrorBoundary>
  </StrictMode>
);

/* eslint-disable react-refresh/only-export-components */
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/App.tsx';
import { ApplicationShell } from './app/ApplicationShell.tsx';
import { ErrorBoundary } from './shared/components/ErrorBoundary.tsx';
import { resolvePage } from './shared/pageRouting.ts';

const ConjugateInfoPage = lazy(() =>
  import('./features/conjugate-info/ConjugateInfoPage.tsx').then((m) => ({
    default: m.ConjugateInfoPage,
  }))
);

const LearnPage = lazy(() =>
  import('./features/conjugate-info/LearnPage.tsx').then((m) => ({ default: m.LearnPage }))
);

const MetricGuidePage = lazy(() =>
  import('./features/conjugate-info/MetricGuidePage.tsx').then((m) => ({
    default: m.MetricGuidePage,
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

const ExerciseAlternativesPage = lazy(() =>
  import('./features/exercise-alternatives/ExerciseAlternativesPage.tsx').then((m) => ({
    default: m.ExerciseAlternativesPage,
  }))
);
const LAZY_PAGES = {
  learn: LearnPage,
  metrics: MetricGuidePage,
  conjugate: ConjugateInfoPage,
  index: IndexPage,
  validator: ValidatorPage,
  'pipeline-validation': PipelineValidationPage,
  coach: TeamViewPage,
  team: TeamViewPage,
  'team-summary': TeamSummaryPage,
  alternatives: ExerciseAlternativesPage,
};

function resolvePageComponent(page: string | null) {
  if (page === 'tools') {
    return <App destination="tools" />;
  }
  if (page === 'setup') {
    return <App destination="setup" />;
  }
  if (page === null || page === 'my-training') {
    return <App />;
  }
  const Page = LAZY_PAGES[page as keyof typeof LAZY_PAGES];
  return Page ? (
    <Suspense>
      <Page />
    </Suspense>
  ) : (
    <p>Page not found.</p>
  );
}

const page = resolvePage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ApplicationShell page={page}>{resolvePageComponent(page)}</ApplicationShell>
    </ErrorBoundary>
  </StrictMode>
);

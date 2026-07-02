/* eslint-disable react-refresh/only-export-components */
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary.tsx';

const ConjugateInfoPage = lazy(() =>
  import('./components/conjugate/ConjugateInfoPage.tsx').then((m) => ({
    default: m.ConjugateInfoPage,
  }))
);

const IndexPage = lazy(() =>
  import('./components/pages/IndexPage.tsx').then((m) => ({ default: m.IndexPage }))
);

const ValidatorPage = lazy(() =>
  import('./components/pages/ValidatorPage.tsx').then((m) => ({ default: m.ValidatorPage }))
);

const TextInputPage = lazy(() =>
  import('./components/pages/TextInputPage.tsx').then((m) => ({ default: m.TextInputPage }))
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
  if (page === 'text') {
    return (
      <Suspense>
        <TextInputPage />
      </Suspense>
    );
  }
  if (page === null) {
    return <App />;
  }
  return <p>Page not found.</p>;
}

const KNOWN_PAGES = new Set(['conjugate', 'index', 'validator', 'text']);

function resolvePage(): string | null {
  const queryPage = new URLSearchParams(window.location.search).get('page');
  if (queryPage) {
    return queryPage;
  }
  const lastSegment = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
  return KNOWN_PAGES.has(lastSegment) ? lastSegment : null;
}

const page = resolvePage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{resolvePageComponent(page)}</ErrorBoundary>
  </StrictMode>
);

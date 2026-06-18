/* eslint-disable react-refresh/only-export-components */
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

const ConjugateInfoPage = lazy(() =>
  import('./components/ConjugateInfoPage.tsx').then((m) => ({ default: m.ConjugateInfoPage }))
);

const IndexPage = lazy(() =>
  import('./components/IndexPage.tsx').then((m) => ({ default: m.IndexPage }))
);

const ValidatorPage = lazy(() =>
  import('./components/ValidatorPage.tsx').then((m) => ({ default: m.ValidatorPage }))
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
  if (page === null) {
    return <App />;
  }
  return <p>Page not found.</p>;
}

const KNOWN_PAGES = new Set(['conjugate', 'index', 'validator']);

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

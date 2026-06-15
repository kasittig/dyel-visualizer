/* eslint-disable react-refresh/only-export-components */
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const ConjugateInfoPage = lazy(() =>
  import("./components/ConjugateInfoPage.tsx").then((m) => ({ default: m.ConjugateInfoPage }))
);

function resolvePageComponent(page: string | null) {
  if (page === "conjugate")
    return (
      <Suspense>
        <ConjugateInfoPage />
      </Suspense>
    );
  if (page === null) return <App />;
  return <p>Page not found.</p>;
}

const page = new URLSearchParams(window.location.search).get("page");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>{resolvePageComponent(page)}</ErrorBoundary>
  </StrictMode>
);

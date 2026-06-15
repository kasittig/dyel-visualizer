import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ConjugateInfoPage } from "./components/ConjugateInfoPage.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

function resolvePageComponent(page: string | null) {
  if (page === "conjugate") return <ConjugateInfoPage />;
  if (page === null) return <App />;
  return <p>Page not found.</p>;
}

const page = new URLSearchParams(window.location.search).get("page");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>{resolvePageComponent(page)}</ErrorBoundary>
  </StrictMode>
);

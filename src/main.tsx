import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ConjugateInfoPage } from "./components/ConjugateInfoPage.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const page = new URLSearchParams(window.location.search).get("page");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>{page === "conjugate" ? <ConjugateInfoPage /> : <App />}</ErrorBoundary>
  </StrictMode>
);

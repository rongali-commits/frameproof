import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProductRoot } from "./ProductRoot";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "./quality.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ProductRoot />
    </ErrorBoundary>
  </StrictMode>,
);

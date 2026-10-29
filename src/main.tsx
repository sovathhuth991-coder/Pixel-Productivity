import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { SyncProvider } from "./context/SyncContext.tsx";
import SyncGate from "./components/SyncGate.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

// A deploy replaces every hashed chunk. A tab that is still open then asks
// for a file that no longer exists, and the lazy route rejects. Reload once
// (not in a loop) so the user lands on the new build instead of a blank
// screen. The timestamp guard also protects against a CDN that is halfway
// through a rollout.
const CHUNK_RELOAD_KEY = "pixel_chunk_reload_at";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return; // let it throw into the boundary
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — still reload once */
  }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="App">
    <SyncProvider>
      <SyncGate>
        <App />
      </SyncGate>
    </SyncProvider>
  </ErrorBoundary>,
);

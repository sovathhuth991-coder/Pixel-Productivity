import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { SyncProvider } from "./context/SyncContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SyncProvider>
    <App />
  </SyncProvider>,
);

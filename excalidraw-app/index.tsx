import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../excalidraw-app/sentry";

import ExcalidrawApp from "./App";

window.__EXCALIDRAW_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Self-hosted deployment doesn't need PWA offline behavior, and the SW
// caches the app shell aggressively which makes rebuilds feel stuck.
// Actively unregister any previously-installed SW + clear its caches so
// existing users pick up new builds on next reload.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
}
if (typeof caches !== "undefined") {
  caches
    .keys()
    .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    .catch(() => {});
}

root.render(
  <StrictMode>
    <ExcalidrawApp />
  </StrictMode>,
);

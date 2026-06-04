import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Global fetch wrapper to allow the published static frontend (e.g. on Netlify)
// to connect back to this active full-stack server backend.
try {
  const originalFetch = window.fetch;
  Object.defineProperty(window, "fetch", {
    value: function (input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === "string" && input.startsWith("/api/")) {
        const baseUrl = import.meta.env.VITE_API_URL || "";
        if (baseUrl) {
          const sanitizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
          const sanitizedInput = input.startsWith("/") ? input : `/${input}`;
          return originalFetch(`${sanitizedBase}${sanitizedInput}`, init);
        }
      }
      return originalFetch(input, init);
    },
    writable: true,
    configurable: true
  });
} catch (fetchErr) {
  console.warn("Global fetch override skipped in this environment:", fetchErr);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Bootstrap order is critical — storage and SSE must register before any
// @opennative/shared store or streaming call is made.
import "./lib/storageBootstrap";
import "./lib/sseBootstrap";
import "./global.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { App } from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

createRoot(container).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

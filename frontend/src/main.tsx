/**
 * Tệp: frontend/src/main.tsx
 * Mục đích: Entrypoint của ứng dụng. Mount React app vào DOM.
 * Ghi chú: Import các style toàn cục và bootstrap `App`.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/tailwind.css";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

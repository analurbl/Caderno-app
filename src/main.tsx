import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, MemoryRouter } from "react-router-dom";
import { IS_PREVIEW } from "./lib/api";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {IS_PREVIEW ? (
      <MemoryRouter>
        <App />
      </MemoryRouter>
    ) : (
      <HashRouter>
        <App />
      </HashRouter>
    )}
  </React.StrictMode>,
);

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "7.css/dist/7.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

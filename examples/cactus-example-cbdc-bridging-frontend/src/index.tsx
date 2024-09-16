import React from "react";
import { CssBaseline } from "@mui/material";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>,
);

// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { UNSAFE_DataRouterStateContext } from "react-router-dom";
import App from "./App";

const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter future={router.future}>
    <App />
  </BrowserRouter>
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "minreact-ui/dist/minreact-ui.css";
import "@/styles/index.scss";
import { initTheme } from "@/store/themeStore";
import App from "./App";

initTheme();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

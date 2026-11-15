import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "src"),
        },
        // minreact-ui / minutool 通过 link 引入，其目录下也存在 node_modules：
        // 强制这些共享依赖统一从本项目的 node_modules 解析，避免出现两份 React 实例
        dedupe: [
            "react",
            "react-dom",
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
            "react-dom/client",
            "@radix-ui/react-popover",
            "react-toastify",
            "minutool",
        ],
    },
    server: {
        host: true,
        port: 5190,
    },
    preview: {
        host: true,
        port: 5190,
    },
});

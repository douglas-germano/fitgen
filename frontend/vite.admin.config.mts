import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_API_URL");
    return {
        plugins: [
            tanstackStart({ srcDirectory: "admin", spa: { enabled: true } }),
            react(),
            tailwind(),
        ],
        css: { postcss: { plugins: [] } },
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
                "@admin": fileURLToPath(new URL("./admin", import.meta.url)),
            },
        },
        // Preserve the existing Pages build variable for the shared Flask API client.
        define: {
            "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(env.NEXT_PUBLIC_API_URL ?? ""),
        },
        environments: {
            // TanStack Start's Vite prerender server loads the SSR entry with a .js suffix.
            ssr: { build: { rolldownOptions: { output: { entryFileNames: "[name].js" } } } },
        },
        build: { outDir: "admin/dist", copyPublicDir: false },
    };
});

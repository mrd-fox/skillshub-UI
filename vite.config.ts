import {defineConfig, type PluginOption} from "vite";
import react from "@vitejs/plugin-react";
import istanbul from "vite-plugin-istanbul";
import * as path from "node:path";

export default defineConfig(() => {
    const reactPlugins = react();
    const normalizedReactPlugins: PluginOption[] = Array.isArray(reactPlugins) ? reactPlugins : [reactPlugins];

    return {
        plugins: [
            ...normalizedReactPlugins,
            istanbul({
                include: "src/**/*",
                exclude: [
                    "node_modules/**",
                    "src/test/**",
                    "src/components/ui/**",
                    "**/*.test.*",
                    "**/*.spec.*",
                    "**/*.stories.*",
                ],
                extension: [".ts", ".tsx"],
                cypress: true,
                requireEnv: true,
                forceBuildInstrument: true,
            }),
        ],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        build: {
            sourcemap: true,
        },
    };
});

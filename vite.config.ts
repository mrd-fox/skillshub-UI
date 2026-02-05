import {defineConfig, type PluginOption} from "vite";
import react from "@vitejs/plugin-react";
import istanbul from "vite-plugin-istanbul";
import * as path from "node:path";

export default defineConfig(() => {
    const enableE2ECoverage = process.env.E2E_COVERAGE === "true";

    // react() may return PluginOption or PluginOption[] depending on versions
    const reactPlugins = react();
    const normalizedReactPlugins: PluginOption[] = Array.isArray(reactPlugins) ? reactPlugins : [reactPlugins];

    const coveragePlugin: PluginOption[] = enableE2ECoverage
        ? [
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
        ]
        : [];

    return {
        plugins: [
            ...normalizedReactPlugins,
            ...coveragePlugin,
        ],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        build: {
            // Coverage needs sourcemaps to map executed lines back to TS/TSX
            sourcemap: enableE2ECoverage,
        },
    };
});

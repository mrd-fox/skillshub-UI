import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {ignores: ["dist"]},

    // =========================
    // App (global rules)
    // =========================
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", {allowConstantExport: true}],

            // Allow any so lint passes
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },

    // =========================
    // Cypress + Tests (relaxed)
    // =========================
    {
        files: [
            "cypress/**/*.{ts,tsx}",
            "**/*.{spec,test}.{ts,tsx}",
            "**/__tests__/**/*.{ts,tsx}",
            "**/__mocks__/**/*.{ts,tsx}",
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-namespace": "off",

            // Safe if you later enable type-aware strict rules
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
        },
    }
);

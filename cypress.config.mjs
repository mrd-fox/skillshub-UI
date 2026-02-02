import {defineConfig} from "cypress";

export default defineConfig({
    e2e: {
        baseUrl: "http://localhost:5173",
        specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
        supportFile: "cypress/support/e2e.ts",
        videosFolder: "cypress/videos",
        screenshotsFolder: "cypress/screenshots",
        fixturesFolder: "cypress/fixtures",
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
        screenshotOnRunFailure: true,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,

        setupNodeEvents(on, config) {
            // Force Cypress TypeScript compiler to use the Cypress tsconfig
            process.env.TS_NODE_PROJECT = "cypress/tsconfig.json";
            return config;
        },
    },
});

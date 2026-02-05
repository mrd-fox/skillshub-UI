// ***********************************************************
// This support/e2e.ts file is processed and loaded automatically
// before your test files.
//
// Global configuration and behavior that modifies Cypress.
// ***********************************************************

import "./commands";

// Enable code coverage collection for Cypress E2E runs.
// This requires the app to be instrumented (E2E_COVERAGE=true) via vite-plugin-istanbul.
import "@cypress/code-coverage/support";

beforeEach(() => {
    // Example: you can set consistent viewport here if needed
    // cy.viewport(1280, 720);
});

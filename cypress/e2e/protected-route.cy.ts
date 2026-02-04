/// <reference types="cypress" />

describe("Protected Route Redirect (Unauthenticated) - Gateway decoupled", () => {
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    function addHttpDebugLogger() {
        cy.intercept("GET", "**/*", (req) => {
            if (req.url.includes("auth") || req.url.includes("users") || req.url.includes("oauth2")) {
                // eslint-disable-next-line no-console
                console.log("HTTP:", req.method, req.url);
            }
        }).as("debugGetAll");
    }

    /**
     * We only assert the FIRST redirect step: /api/auth/login.
     * The rest of the OAuth2 chain may be server-side redirects or cross-origin (Keycloak),
     * which Cypress will not reliably observe in the same test.
     */
    function interceptGatewayLoginLanding() {
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: "<html><body>Mock Gateway Login Landing</body></html>",
        }).as("gatewayLogin");
    }

    it("should trigger gateway login when accessing protected tutor route without authentication", () => {
        addHttpDebugLogger();
        interceptGatewayLoginLanding();

        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("authMeUnauthorized");

        cy.intercept("GET", "**/api/users/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("usersMeUnauthorized");

        cy.visit("/dashboard/tutor");

        cy.wait("@authMeUnauthorized", {timeout: 10000});

        // ✅ The only stable assertion for this scope
        cy.wait("@gatewayLogin", {timeout: 10000});
    });

    it("should show loading state before redirecting", () => {
        addHttpDebugLogger();
        interceptGatewayLoginLanding();

        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            delay: 500,
            body: {error: "Unauthorized"},
        }).as("authMeDelayed");

        cy.intercept("GET", "**/api/users/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("usersMeDelayed");

        cy.visit("/dashboard/tutor");

        cy.contains("Chargement de la session...", {timeout: 2000}).should("be.visible");

        cy.wait("@authMeDelayed", {timeout: 10000});
        cy.wait("@gatewayLogin", {timeout: 10000});
    });

    it("should not display backend technical error messages", () => {
        addHttpDebugLogger();
        interceptGatewayLoginLanding();

        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {
                error: "AUTHENTICATION_FAILED",
                message: "JWT token expired at 2026-02-02T10:00:00Z",
                stack: "Error: JWT token expired...",
            },
        }).as("authMeTechnical");

        cy.intercept("GET", "**/api/users/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("usersMeTechnical");

        cy.visit("/dashboard/tutor");

        cy.wait("@authMeTechnical", {timeout: 10000});

        cy.contains("AUTHENTICATION_FAILED").should("not.exist");
        cy.contains("JWT token expired at 2026-02-02T10:00:00Z").should("not.exist");
        cy.contains("Error: JWT token expired").should("not.exist");
        cy.contains("stack").should("not.exist");

        cy.wait("@gatewayLogin", {timeout: 10000});
    });

    it("should handle 401 on multiple protected routes consistently", () => {
        addHttpDebugLogger();
        interceptGatewayLoginLanding();

        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("authMe401");

        cy.intercept("GET", "**/api/users/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("usersMe401");

        const protectedRoutes = [
            "/dashboard/tutor",
            "/dashboard/tutor/courses",
            "/dashboard/tutor/create",
        ];

        cy.wrap(protectedRoutes).each((route) => {
            cy.visit(String(route));

            cy.wait("@authMe401", {timeout: 10000});
            cy.wait("@gatewayLogin", {timeout: 10000});
        });
    });

    it("should NOT redirect on network error (only 401 redirects)", () => {
        addHttpDebugLogger();

        // Track if login is hit (it must NOT be hit)
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: "<html><body>Mock Gateway Login Landing</body></html>",
        }).as("gatewayLogin");

        cy.intercept("GET", "**/api/auth/me", {
            forceNetworkError: true,
        }).as("authMeNetworkError");

        cy.intercept("GET", "**/api/users/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("usersMeNetworkError");

        cy.visit("/dashboard/tutor");

        cy.wait("@authMeNetworkError", {timeout: 10000});

        // Ensure /api/auth/login was NOT called
        cy.get("@gatewayLogin.all").then((calls) => {
            expect(calls.length).to.equal(0);
        });
    });
});

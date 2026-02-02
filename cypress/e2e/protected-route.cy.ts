/// <reference types="cypress" />

/**
 * E2E Test: Protected Route Redirect (Unauthenticated)
 *
 * This test verifies that when an unauthenticated user tries to access
 * a protected route (/dashboard/tutor), they are redirected to the login page.
 *
 * Scenario:
 * - Mock GET /api/auth/me to return 401 (unauthenticated)
 * - Visit /dashboard/tutor directly
 * - Expected: App redirects to /api/auth/login
 *
 * All backend calls are mocked to run in CI without services.
 */

describe("Protected Route Redirect (Unauthenticated)", () => {
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it("should redirect to login when accessing protected route without authentication", () => {
        // Mock GET /api/auth/me -> 401 (unauthenticated)
        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {
                error: "Unauthorized",
                message: "Not authenticated",
            },
        }).as("authMeUnauthorized");

        // Mock the login page to prevent actual redirect to Keycloak
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: '<html lang="en"><head><title>Login</title></head><body><h1>Mock Login Page</h1></body></html>',
        }).as("loginPage");

        // Visit a protected route directly (without authentication)
        cy.visit("/dashboard/tutor");

        // Wait for the auth check to complete
        cy.wait("@authMeUnauthorized", {timeout: 10000});

        // Verify that the app redirects to /api/auth/login
        cy.location("pathname", {timeout: 10000}).should("eq", "/api/auth/login");

        // Wait for the login page to load
        cy.wait("@loginPage", {timeout: 10000});

        // Verify the mock login page is displayed
        cy.contains("Mock Login Page").should("be.visible");

        // Verify we're not on the protected route anymore
        cy.location("pathname").should("not.contain", "/dashboard/tutor");
    });

    it("should redirect to login when accessing tutor courses page without authentication", () => {
        // Mock GET /api/auth/me -> 401
        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("authMeUnauthorized");

        // Mock login page
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: '<html lang="en"><body>Login Required</body></html>',
        }).as("loginPage");

        // Try to access a specific tutor page
        cy.visit("/dashboard/tutor/courses");

        // Wait for auth check
        cy.wait("@authMeUnauthorized");

        // Verify redirect to login
        cy.location("pathname", {timeout: 10000}).should("eq", "/api/auth/login");
        cy.wait("@loginPage");

        // Verify not on the tutor courses page
        cy.location("pathname").should("not.contain", "/dashboard/tutor");
    });

    it("should show loading state before redirecting", () => {
        // Mock with a slight delay to observe the loading state
        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            delay: 500, // Add delay to observe loading state
            body: {error: "Unauthorized"},
        }).as("authMeDelayed");

        // Mock login page
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: '<html lang="en"><body>Login</body></html>',
        }).as("loginPage");

        cy.visit("/dashboard/tutor");

        // Should show loading message while auth is being checked
        cy.contains("Chargement de la session...", {timeout: 5000}).should("be.visible");

        // Wait for auth response
        cy.wait("@authMeDelayed");

        // Eventually redirects to login
        cy.location("pathname", {timeout: 10000}).should("eq", "/api/auth/login");
    });

    it("should not display backend technical error messages", () => {
        // Mock 401 with technical backend message
        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {
                error: "AUTHENTICATION_FAILED",
                message: "JWT token expired at 2026-02-02T10:00:00Z",
                stack: "Error: JWT token expired...",
            },
        }).as("authMeTechnical");

        // Mock login page
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: '<html lang="en"><body>Login Page</body></html>',
        }).as("loginPage");

        cy.visit("/dashboard/tutor");

        cy.wait("@authMeTechnical");
        cy.wait("@loginPage");

        // Verify no technical details are shown to the user
        cy.contains("AUTHENTICATION_FAILED").should("not.exist");
        cy.contains("JWT token expired").should("not.exist");
        cy.contains("stack").should("not.exist");

        // Verify clean redirect to login
        cy.location("pathname").should("eq", "/api/auth/login");
    });

    it("should handle 401 on multiple protected routes consistently", () => {
        // Mock auth failure
        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("authMe401");

        // Mock login page
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: '<html lang="en"><body>Login</body></html>',
        }).as("loginPage");

        // Test different protected routes
        const protectedRoutes = [
            "/dashboard/tutor",
            "/dashboard/tutor/courses",
            "/dashboard/tutor/create",
        ];

        protectedRoutes.forEach((route) => {
            cy.visit(route);
            cy.wait("@authMe401");
            cy.location("pathname", {timeout: 10000}).should("eq", "/api/auth/login");
            cy.wait("@loginPage");
        });
    });

    it("should not attempt to load real Keycloak page", () => {
        // Mock 401
        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("authMe401");

        // Mock login endpoint
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: '<html lang="en"><body><div id="mock-login">Mock Login</div></body></html>',
        }).as("mockLoginPage");

        // Visit protected route
        cy.visit("/dashboard/tutor");

        cy.wait("@authMe401");
        cy.wait("@mockLoginPage");

        // Verify we're at the mocked login page
        cy.location("pathname").should("eq", "/api/auth/login");
        cy.get("#mock-login").should("be.visible");

        // Verify no real Keycloak URLs are being loaded
        cy.location("href").should("not.contain", "keycloak");
        cy.location("href").should("not.contain", "realms");
        cy.location("href").should("not.contain", "auth/realms");
    });

    it("should handle network errors gracefully on auth check", () => {
        // Mock network error (no response)
        cy.intercept("GET", "**/api/auth/me", {
            forceNetworkError: true,
        }).as("authMeNetworkError");

        // Mock login page (in case it redirects)
        cy.intercept("GET", "**/api/auth/login", {
            statusCode: 200,
            headers: {"content-type": "text/html"},
            body: '<html lang="en"><body>Login</body></html>',
        }).as("loginPage");

        cy.visit("/dashboard/tutor");

        // The app should handle the error and eventually redirect or show error
        // Since axios interceptor maps network errors to 500, but auth context
        // catches all errors and sets isAuthenticated=false
        cy.wait("@authMeNetworkError");

        // Should eventually redirect to login or show appropriate message
        cy.location("pathname", {timeout: 15000}).should("eq", "/api/auth/login");
    });
});

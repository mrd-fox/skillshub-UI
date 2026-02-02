/// <reference types="cypress" />

describe("Protected Route Redirect (Unauthenticated) - Gateway decoupled", () => {
    const API_ROOT = "http://localhost:8080/api";
    const LOGIN_URL = `${API_ROOT}/auth/login`;

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    function visitProtectedRouteWithRedirectStub(route: string) {
        cy.visit(route, {
            onBeforeLoad(win) {
                // IMPORTANT:
                // Do NOT use cy.stub(win.location, "assign") (defineProperty issue on Location in Electron).
                // Direct assignment avoids defineProperty and works in Electron.
                const assignStub = cy.stub().as("locationAssign");
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (win.location as any).assign = assignStub;
            },
        });
    }

    function addHttpDebugLogger() {
        // Logs all auth/users related calls so we can see the real URL used by the app.
        cy.intercept("GET", "**/*", (req) => {
            if (req.url.includes("auth") || req.url.includes("users")) {
                // eslint-disable-next-line no-console
                console.log("HTTP:", req.method, req.url);
            }
        }).as("debugGetAll");
    }

    it("should trigger login redirect when accessing protected tutor route without authentication", () => {
        addHttpDebugLogger();

        cy.intercept("GET", "**/auth/me", {
            statusCode: 401,
            body: {
                error: "Unauthorized",
                message: "Not authenticated",
            },
        }).as("authMeUnauthorized");

        visitProtectedRouteWithRedirectStub("/dashboard/tutor");

        cy.wait("@authMeUnauthorized", {timeout: 10000});

        cy.get("@locationAssign").should("have.been.calledWith", LOGIN_URL);
    });

    it("should show loading state before redirecting", () => {
        addHttpDebugLogger();

        cy.intercept("GET", "**/auth/me", {
            statusCode: 401,
            delay: 500,
            body: {error: "Unauthorized"},
        }).as("authMeDelayed");

        visitProtectedRouteWithRedirectStub("/dashboard/tutor");

        cy.contains("Chargement de la session...", {timeout: 5000}).should("be.visible");

        cy.wait("@authMeDelayed", {timeout: 10000});

        cy.get("@locationAssign").should("have.been.calledWith", LOGIN_URL);
    });

    it("should not display backend technical error messages", () => {
        addHttpDebugLogger();

        cy.intercept("GET", "**/auth/me", {
            statusCode: 401,
            body: {
                error: "AUTHENTICATION_FAILED",
                message: "JWT token expired at 2026-02-02T10:00:00Z",
                stack: "Error: JWT token expired...",
            },
        }).as("authMeTechnical");

        visitProtectedRouteWithRedirectStub("/dashboard/tutor");

        cy.wait("@authMeTechnical", {timeout: 10000});

        cy.contains("AUTHENTICATION_FAILED").should("not.exist");
        cy.contains("JWT token expired").should("not.exist");
        cy.contains("stack").should("not.exist");

        cy.get("@locationAssign").should("have.been.calledWith", LOGIN_URL);
    });

    it("should handle 401 on multiple protected routes consistently", () => {
        addHttpDebugLogger();

        cy.intercept("GET", "**/auth/me", {
            statusCode: 401,
            body: {error: "Unauthorized"},
        }).as("authMe401");

        const protectedRoutes = [
            "/dashboard/tutor",
            "/dashboard/tutor/courses",
            "/dashboard/tutor/create",
        ];

        cy.wrap(protectedRoutes).each((route) => {
            visitProtectedRouteWithRedirectStub(String(route));

            cy.wait("@authMe401", {timeout: 10000});
            cy.get("@locationAssign").should("have.been.calledWith", LOGIN_URL);
        });
    });

    it("should handle network errors gracefully on auth check", () => {
        addHttpDebugLogger();

        cy.intercept("GET", "**/auth/me", {
            forceNetworkError: true,
        }).as("authMeNetworkError");

        visitProtectedRouteWithRedirectStub("/dashboard/tutor");

        cy.wait("@authMeNetworkError", {timeout: 10000});
        cy.get("@locationAssign").should("have.been.calledWith", LOGIN_URL);
    });
});

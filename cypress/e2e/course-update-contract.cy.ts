/// <reference types="cypress" />
/**
 * Cypress E2E Test: Course Update Contract (FULLY MOCKED)
 *
 * Validates frontend compliance with backend PATCH-like PUT contract:
 * - Meta-only updates MUST NOT include sections/chapters
 * - Structure updates MUST include sections (and can include meta if also dirty)
 * - Delete-all sections requires explicit confirmation when the course previously had sections
 * - Locks: WAITING_VALIDATION, PUBLISHED, PROCESSING
 *
 * IMPORTANT:
 * - The real API uses "/api/course/..." (singular), not "/api/courses/...".
 * - This spec is fully mocked: no real backend calls.
 */

describe("Course Update Contract (mocked)", () => {
    const COURSE_ID = "test-course-123";

    function stubAuth(): void {
        cy.intercept("GET", "**/api/auth/me", {
            statusCode: 200,
            body: {id: "test-tutor", email: "tutor@test.com", roles: ["TUTOR"]},
        }).as("authMe");

        cy.intercept("GET", "**/api/users/me", {
            statusCode: 200,
            body: {
                id: "test-tutor",
                email: "tutor@test.com",
                firstName: "Test",
                lastName: "Tutor",
                roles: ["TUTOR"],
            },
        }).as("usersMe");
    }

    function blockUnexpectedApiCalls(): void {
        // Catch-all to ensure we never hit a real backend unexpectedly.
        cy.intercept(
            {method: /GET|POST|PUT|PATCH|DELETE/, url: "**/api/**"},
            (req) => {
                const allowlisted =
                    req.url.includes("/api/auth/me") ||
                    req.url.includes("/api/users/me") ||
                    req.url.includes(`/api/course/${COURSE_ID}`);

                if (!allowlisted) {
                    req.reply({
                        statusCode: 500,
                        body: {
                            message: `Unexpected API call in test: ${req.method} ${req.url}. Add a cy.intercept stub.`,
                        },
                    });
                    return;
                }

                req.continue();
            }
        );
    }

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        stubAuth();
        blockUnexpectedApiCalls();
    });

    it("Meta-only title change -> PUT must include ONLY title (no sections)", () => {
        cy.intercept("GET", `**/api/course/${COURSE_ID}`, {
            statusCode: 200,
            body: {
                id: COURSE_ID,
                title: "Original Title",
                description: "Original Description",
                price: 100,
                status: "DRAFT",
                sections: [
                    {
                        id: "section-1",
                        title: "Section 1",
                        position: 1,
                        chapters: [
                            {id: "chapter-1", title: "Chapter 1", position: 1, video: null},
                        ],
                    },
                ],
            },
        }).as("getCourse");

        cy.intercept("PUT", `**/api/course/${COURSE_ID}`, (req) => {
            expect(req.body).to.have.property("title", "New Title");
            expect(req.body).to.not.have.property("sections");
            expect(req.body).to.not.have.property("description");
            expect(req.body).to.not.have.property("price");

            req.reply({
                statusCode: 200,
                body: {
                    id: COURSE_ID,
                    title: "New Title",
                    description: "Original Description",
                    price: 100,
                    status: "DRAFT",
                    sections: [
                        {
                            id: "section-1",
                            title: "Section 1",
                            position: 1,
                            chapters: [
                                {id: "chapter-1", title: "Chapter 1", position: 1, video: null},
                            ],
                        },
                    ],
                },
            });
        }).as("updateCourse");

        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/edit`);
        cy.wait("@getCourse");

        cy.get("input#course-title").clear().type("New Title");
        cy.contains("button", "Enregistrer").click();

        cy.wait("@updateCourse");
    });

    it("Meta + structure together -> PUT must include title AND sections; new chapter has no id (CREATE)", () => {
        cy.intercept("GET", `**/api/course/${COURSE_ID}`, {
            statusCode: 200,
            body: {
                id: COURSE_ID,
                title: "Original Title",
                description: "Original Description",
                price: 100,
                status: "DRAFT",
                sections: [
                    {
                        id: "section-1",
                        title: "Section 1",
                        position: 1,
                        chapters: [
                            {id: "chapter-1", title: "Chapter 1", position: 1, video: null},
                        ],
                    },
                ],
            },
        }).as("getCourse");

        cy.intercept("PUT", `**/api/course/${COURSE_ID}`, (req) => {
            expect(req.body).to.have.property("title", "New Title");
            expect(req.body).to.have.property("sections");
            expect(req.body.sections).to.be.an("array");

            const section1 = req.body.sections[0];
            expect(section1).to.have.property("id", "section-1");
            expect(section1).to.have.property("chapters");
            expect(section1.chapters).to.have.length(2);

            const newChapter = section1.chapters[1];
            expect(newChapter).to.not.have.property("id"); // CREATE
            expect(newChapter).to.have.property("title", "Nouveau chapitre");

            req.reply({
                statusCode: 200,
                body: {
                    id: COURSE_ID,
                    title: "New Title",
                    description: "Original Description",
                    price: 100,
                    status: "DRAFT",
                    sections: [
                        {
                            id: "section-1",
                            title: "Section 1",
                            position: 1,
                            chapters: [
                                {id: "chapter-1", title: "Chapter 1", position: 1, video: null},
                                {id: "chapter-2", title: "Nouveau chapitre", position: 2, video: null},
                            ],
                        },
                    ],
                },
            });
        }).as("updateCourse");

        // Change title (meta dirty)
        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/edit`);
        cy.wait("@getCourse");
        cy.get("input#course-title").clear().type("New Title");

        // Add a chapter (structure dirty)
        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/sections`);
        cy.wait("@getCourse");

        // Expand section accordion if needed
        cy.contains("Section 1").click();
        cy.contains("button", "+ Ajouter un chapitre").click();

        cy.contains("button", "Enregistrer").click();
        cy.wait("@updateCourse");
    });

    it("Delete-all confirmation -> no PUT before confirm; PUT sections:[] after confirm", () => {
        cy.intercept("GET", `**/api/course/${COURSE_ID}`, {
            statusCode: 200,
            body: {
                id: COURSE_ID,
                title: "Test Course",
                description: "Test Description",
                price: 100,
                status: "DRAFT",
                sections: [
                    {
                        id: "section-1",
                        title: "Section 1",
                        position: 1,
                        chapters: [{id: "chapter-1", title: "Chapter 1", position: 1, video: null}],
                    },
                ],
            },
        }).as("getCourse");

        let putCount = 0;

        cy.intercept("PUT", `**/api/course/${COURSE_ID}`, (req) => {
            putCount += 1;
            expect(req.body).to.have.property("sections");
            expect(req.body.sections).to.be.an("array").and.to.have.length(0);

            req.reply({
                statusCode: 200,
                body: {
                    id: COURSE_ID,
                    title: "Test Course",
                    description: "Test Description",
                    price: 100,
                    status: "DRAFT",
                    sections: [],
                },
            });
        }).as("updateCourse");

        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/sections`);
        cy.wait("@getCourse");

        // Delete the only section
        cy.get('button[aria-label="Delete section"]').click();

        // Save -> should open confirmation modal
        cy.contains("button", "Enregistrer").click();
        cy.contains("Supprimer toutes les sections").should("be.visible");

        // Cancel -> no PUT must be sent
        cy.contains("button", "Annuler").click();
        cy.wrap(null).then(() => {
            expect(putCount).to.equal(0);
        });

        // Save again -> confirm -> PUT is sent
        cy.contains("button", "Enregistrer").click();
        cy.contains("button", "Confirmer la suppression").click();

        cy.wait("@updateCourse");
        cy.wrap(null).then(() => {
            expect(putCount).to.equal(1);
        });
    });

    it("Initially empty course -> can send sections:[] without delete-all confirmation", () => {
        cy.intercept("GET", `**/api/course/${COURSE_ID}`, {
            statusCode: 200,
            body: {
                id: COURSE_ID,
                title: "Empty Course",
                description: "Empty Description",
                price: 100,
                status: "DRAFT",
                sections: [],
            },
        }).as("getCourse");

        cy.intercept("PUT", `**/api/course/${COURSE_ID}`, (req) => {
            expect(req.body).to.have.property("sections");
            expect(req.body.sections).to.be.an("array").and.to.have.length(0);

            req.reply({
                statusCode: 200,
                body: {
                    id: COURSE_ID,
                    title: "Empty Course",
                    description: "Empty Description",
                    price: 100,
                    status: "DRAFT",
                    sections: [],
                },
            });
        }).as("updateCourse");

        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/sections`);
        cy.wait("@getCourse");

        // If the course is empty and user tries to save structure-empty state, there should be no delete-all modal
        // We still need structureDirty to be true -> add then delete a section
        cy.contains("button", "+ Ajouter une section").click();
        cy.get('button[aria-label="Delete section"]').click();

        cy.contains("button", "Enregistrer").click();

        cy.contains("Supprimer toutes les sections").should("not.exist");
        cy.wait("@updateCourse");
    });

    it("PUBLISHED lock -> inputs disabled; structure actions disabled; save disabled", () => {
        cy.intercept("GET", `**/api/course/${COURSE_ID}`, {
            statusCode: 200,
            body: {
                id: COURSE_ID,
                title: "Published Course",
                description: "Published Description",
                price: 100,
                status: "PUBLISHED",
                sections: [
                    {
                        id: "section-1",
                        title: "Section 1",
                        position: 1,
                        chapters: [
                            {
                                id: "chapter-1",
                                title: "Chapter 1",
                                position: 1,
                                video: {id: "video-1", status: "READY", vimeoId: "123456"},
                            },
                        ],
                    },
                ],
            },
        }).as("getCourse");

        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/edit`);
        cy.wait("@getCourse");

        cy.get("input#course-title").should("be.disabled");
        cy.get("textarea#course-description").should("be.disabled");
        cy.contains("button", "Enregistrer").should("be.disabled");

        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/sections`);
        cy.wait("@getCourse");

        cy.contains("button", "+ Ajouter une section").should("be.disabled");
        cy.contains("button", "Enregistrer").should("be.disabled");
    });

    it("WAITING_VALIDATION lock -> save disabled", () => {
        cy.intercept("GET", `**/api/course/${COURSE_ID}`, {
            statusCode: 200,
            body: {
                id: COURSE_ID,
                title: "Waiting Course",
                description: "Waiting Description",
                price: 100,
                status: "WAITING_VALIDATION",
                sections: [
                    {id: "section-1", title: "Section 1", position: 1, chapters: []},
                ],
            },
        }).as("getCourse");

        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/edit`);
        cy.wait("@getCourse");

        cy.contains("button", "Enregistrer").should("be.disabled");
        cy.contains("button", "Publier").should("be.disabled");
    });

    it("No changes -> no PUT call", () => {
        cy.intercept("GET", `**/api/course/${COURSE_ID}`, {
            statusCode: 200,
            body: {
                id: COURSE_ID,
                title: "Test Course",
                description: "Test Description",
                price: 100,
                status: "DRAFT",
                sections: [{id: "section-1", title: "Section 1", position: 1, chapters: []}],
            },
        }).as("getCourse");

        let putCount = 0;

        cy.intercept("PUT", `**/api/course/${COURSE_ID}`, () => {
            putCount += 1;
        }).as("updateCourse");

        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/edit`);
        cy.wait("@getCourse");

        cy.contains("button", "Enregistrer").click();

        cy.wrap(null).then(() => {
            expect(putCount).to.equal(0);
        });
    });
});

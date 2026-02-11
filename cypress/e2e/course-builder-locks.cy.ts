// cypress/e2e/course-builder-locks.cy.ts
/// <reference types="cypress" />

import type {AuthMeResponse, CourseResponse, InternalUserEnvelope} from "../support/cypress-types";

function mockAuthAsTutor(): void {
    const auth: AuthMeResponse = {
        id: "auth-user-123",
        email: "tutor@test.com",
        roles: ["TUTOR", "STUDENT"],
    };

    const envelope: InternalUserEnvelope = {
        created: false,
        user: {
            id: "internal-user-1",
            externalId: "kc-123",
            email: "tutor@test.com",
            firstName: "Test",
            lastName: "Tutor",
            active: true,
            roles: [{name: "TUTOR"}, {name: "STUDENT"}],
        },
    };

    cy.intercept("GET", "**/auth/me", {statusCode: 200, body: auth}).as("authMe");
    cy.intercept("GET", "**/users/me", {statusCode: 200, body: envelope}).as("usersMe");
}

function visitSections(courseId: string, course: CourseResponse): void {
    cy.intercept("GET", new RegExp(`.*/course(s)?/${courseId}$`), {
        statusCode: 200,
        body: course,
    }).as("getCourse");

    cy.intercept("PUT", new RegExp(`.*/course(s)?/${courseId}$`), (req) => {
        req.reply({statusCode: 200, body: course});
    }).as("putCourse");

    cy.intercept("POST", new RegExp(`.*/course(s)?/${courseId}/publish$`), (req) => {
        req.reply({statusCode: 200, body: {}});
    }).as("publishCourse");

    cy.visit(`/dashboard/tutor/course-builder/${courseId}/sections`);

    cy.wait("@authMe");
    cy.wait("@usersMe");
    cy.wait("@getCourse");
}

function openSectionAccordionByTitle(sectionTitle: string): void {
    cy.contains(new RegExp(`\\b${sectionTitle}\\b`, "i"))
        .should("be.visible")
        .click();
}

describe("Course Builder Locks (WAITING_VALIDATION / PENDING / PROCESSING)", () => {
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        mockAuthAsTutor();
    });

    it("should block all structural changes + save + publish when course is WAITING_VALIDATION", () => {
        const courseId = "course-waiting-1";

        const course: CourseResponse = {
            id: courseId,
            title: "Course Waiting Validation",
            description: "desc",
            status: "WAITING_VALIDATION",
            price: 0,
            sections: [
                {
                    id: "sec-1",
                    title: "Section 1",
                    position: 1,
                    chapters: [
                        {
                            id: "ch-1",
                            title: "Chapter 1",
                            position: 1,
                            video: {id: "v-1", status: "READY"},
                        },
                    ],
                },
            ],
        };

        visitSections(courseId, course);

        cy.contains("button", "Enregistrer").should("be.disabled");
        cy.contains("button", "Publier").should("be.disabled");

        cy.contains("button", "+ Ajouter une section").should("be.disabled");

        openSectionAccordionByTitle("Section 1");
        cy.contains("button", "+ Ajouter un chapitre").should("be.disabled");

        cy.get("@putCourse.all").should("have.length", 0);
        cy.get("@publishCourse.all").should("have.length", 0);
    });

    it("should block structure + save + publish when at least one video is PROCESSING or PENDING (upload allowed only for persisted chapters)", () => {
        const courseId = "course-processing-1";

        const course: CourseResponse = {
            id: courseId,
            title: "Course Processing Lock",
            description: "desc",
            status: "DRAFT",
            price: 10,
            sections: [
                {
                    id: "sec-1",
                    title: "Section 1",
                    position: 1,
                    chapters: [
                        {
                            id: "ch-persisted",
                            title: "Persisted chapter (processing)",
                            position: 1,
                            video: {id: "v-processing", status: "PROCESSING"},
                        },
                        {
                            id: "client:123e4567-e89b-12d3-a456-426614174000",
                            title: "Client chapter (unsaved)",
                            position: 2,
                            video: null,
                        },
                    ],
                },
            ],
        };

        visitSections(courseId, course);

        // Global actions locked
        cy.contains("button", "Enregistrer").should("be.disabled");
        cy.contains("button", "Publier").should("be.disabled");

        // Sidebar structure actions locked
        cy.contains("button", "+ Ajouter une section").should("be.disabled");

        openSectionAccordionByTitle("Section 1");
        cy.contains("button", "+ Ajouter un chapitre").should("be.disabled");

        // No mutation calls
        cy.get("@putCourse.all").should("have.length", 0);
        cy.get("@publishCourse.all").should("have.length", 0);

        // Select persisted chapter
        cy.contains("button", "Persisted chapter (processing)").click();

        // Upload exists but edition locked message must be visible
        cy.contains("button", /upload|téléverser|uploader/i).should("exist");
        cy.contains(/upload et suppression désactivés\s*:\s*édition verrouillée/i).should("exist");
    });

    it("should block structure + save + publish when at least one video is PENDING (critical fix: INIT -> PENDING -> lock)", () => {
        const courseId = "course-pending-1";

        const course: CourseResponse = {
            id: courseId,
            title: "Course Pending Lock",
            description: "desc",
            status: "DRAFT",
            price: 10,
            sections: [
                {
                    id: "sec-1",
                    title: "Section 1",
                    position: 1,
                    chapters: [
                        {
                            id: "ch-pending",
                            title: "Chapter with PENDING video",
                            position: 1,
                            video: {id: "v-pending", status: "PENDING"},
                        },
                    ],
                },
            ],
        };

        visitSections(courseId, course);

        cy.contains("button", "Enregistrer").should("be.disabled");
        cy.contains("button", "Publier").should("be.disabled");

        cy.contains("button", "+ Ajouter une section").should("be.disabled");

        openSectionAccordionByTitle("Section 1");
        cy.contains("button", "+ Ajouter un chapitre").should("be.disabled");

        cy.get("@putCourse.all").should("have.length", 0);
        cy.get("@publishCourse.all").should("have.length", 0);
    });
});

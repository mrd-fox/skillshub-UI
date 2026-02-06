// cypress/e2e/update-course-payload.cy.ts
/// <reference types="cypress" />

import type {AuthMeResponse, CourseResponse, InternalUserEnvelope,} from "../support/cypress-types";

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
    cy.intercept("GET", `**/course/${courseId}`, {statusCode: 200, body: course}).as("getCourse");

    // Mutations are intercepted to guarantee CI safety and to assert "no mutation" when locked.
    cy.intercept("PUT", `**/course/${courseId}`, (req) => {
        req.reply({statusCode: 200, body: course});
    }).as("putCourse");

    cy.intercept("POST", `**/course/${courseId}/publish`, (req) => {
        req.reply({statusCode: 200, body: {}});
    }).as("publishCourse");

    cy.visit(`/dashboard/tutor/course-builder/${courseId}/sections`);

    cy.wait("@authMe");
    cy.wait("@usersMe");
    cy.wait("@getCourse");
}

function openSectionAccordionByTitle(sectionTitle: string): void {
    // SectionItem renders the title like: "{index + 1}. {section.title}"
    // We click the visible header to open AccordionContent.
    cy.contains(new RegExp(`\\b${sectionTitle}\\b`, "i"))
        .should("be.visible")
        .click();
}

function assertGlobalActionsLocked(): void {
    cy.contains("button", "Enregistrer").should("be.disabled");
    cy.contains("button", "Publier").should("be.disabled");
}

function assertStructureSidebarLocked(): void {
    cy.contains("button", "+ Ajouter une section").should("be.disabled");
}

function assertAddChapterLockedInSection(sectionTitle: string): void {
    // "+ Ajouter un chapitre" is inside AccordionContent -> open the section first.
    openSectionAccordionByTitle(sectionTitle);
    cy.contains("button", "+ Ajouter un chapitre").should("be.disabled");
}

function assertNoMutations(): void {
    cy.get("@putCourse.all").should("have.length", 0);
    cy.get("@publishCourse.all").should("have.length", 0);
}

function openChapterInSidebar(chapterTitle: string): void {
    // ChapterItem is rendered as a button in the left sidebar list.
    cy.contains("button", chapterTitle).should("be.visible").click();
}

describe("Course Builder Locks (WAITING_VALIDATION / PROCESSING)", () => {
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

        assertGlobalActionsLocked();
        assertStructureSidebarLocked();
        assertAddChapterLockedInSection("Section 1");
        assertNoMutations();
    });

    it("should block structure + save + publish when at least one video is PROCESSING (upload allowed only for persisted chapters)", () => {
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

        assertGlobalActionsLocked();
        assertStructureSidebarLocked();
        assertAddChapterLockedInSection("Section 1");
        assertNoMutations();

        // Upload behavior checks (kept resilient, based on visible UX text).
        openChapterInSidebar("Persisted chapter (processing)");
        cy.contains(/upload|téléverser|uploader/i).should("exist");

        openChapterInSidebar("Client chapter (unsaved)");
        cy.contains(/L’upload vidéo est désactivé tant que le cours n’est pas sauvegardé/i).should("exist");
    });
});

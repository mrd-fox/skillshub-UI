// cypress/e2e/update-course-payload.cy.ts
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

function visitSections(courseId: string, course: CourseResponse): {
    getPutCount: () => number;
    getPublishCount: () => number
} {
    let putCount = 0;
    let publishCount = 0;

    // Be tolerant with URL forms: /course/{id}, /courses/{id}, /api/course/{id}, etc.
    cy.intercept("GET", new RegExp(`.*/course(s)?/${courseId}$`), {statusCode: 200, body: course}).as("getCourse");

    cy.intercept("PUT", new RegExp(`.*/course(s)?/${courseId}$`), (req) => {
        putCount += 1;
        req.reply({statusCode: 200, body: course});
    }).as("putCourse");

    cy.intercept("POST", new RegExp(`.*/course(s)?/${courseId}/publish$`), (req) => {
        publishCount += 1;
        req.reply({statusCode: 200, body: {}});
    }).as("publishCourse");

    cy.visit(`/dashboard/tutor/course-builder/${courseId}/sections`);

    cy.wait("@authMe");
    cy.wait("@usersMe");
    cy.wait("@getCourse");

    return {
        getPutCount: () => putCount,
        getPublishCount: () => publishCount,
    };
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function openSectionAccordionByTitle(sectionTitle: string): void {
    // SectionItem renders the title like: "{index + 1}. {section.title}"
    // Click on the trigger line containing the title
    cy.contains(new RegExp(`\\b${escapeRegExp(sectionTitle)}\\b`, "i"))
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
    openSectionAccordionByTitle(sectionTitle);
    cy.contains("button", "+ Ajouter un chapitre").should("be.disabled");
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

        const counters = visitSections(courseId, course);

        assertGlobalActionsLocked();
        assertStructureSidebarLocked();
        assertAddChapterLockedInSection("Section 1");

        cy.then(() => {
            expect(counters.getPutCount()).to.eq(0);
            expect(counters.getPublishCount()).to.eq(0);
        });
    });


});

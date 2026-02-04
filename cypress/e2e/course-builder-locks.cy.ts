// cypress/e2e/course-builder-locks.cy.ts
/// <reference types="cypress" />

type AuthMeResponse = {
    id: string;
    email: string;
    roles: string[];
};

type InternalUserEnvelope = {
    created: boolean;
    user: {
        id: string;
        externalId: string;
        email: string;
        firstName: string;
        lastName: string;
        active: boolean;
        roles: { name: string }[];
    };
};

type VideoResponse = {
    id: string;
    status: "PENDING" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED";
};

type ChapterResponse = {
    id: string;
    title: string;
    position: number;
    video?: VideoResponse | null;
};

type SectionResponse = {
    id: string;
    title: string;
    position: number;
    chapters: ChapterResponse[];
};

type CourseResponse = {
    id: string;
    title: string;
    description: string;
    status: "DRAFT" | "WAITING_VALIDATION" | "REJECTED" | "PUBLISHED" | "VALIDATED";
    price?: number | null;
    sections: SectionResponse[];
};

function mockAuthAsTutor() {
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

    cy.intercept("GET", "**/auth/me", {
        statusCode: 200,
        body: auth,
    }).as("authMe");

    cy.intercept("GET", "**/users/me", {
        statusCode: 200,
        body: envelope,
    }).as("usersMe");
}

function visitSections(courseId: string, course: CourseResponse) {
    cy.intercept("GET", `**/course/${courseId}`, {
        statusCode: 200,
        body: course,
    }).as("getCourse");

    // Mutations are intercepted to guarantee CI safety and to assert "no mutation" when locked
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

function openSectionAccordionByTitle(sectionTitle: string) {
    // SectionItem renders the title like: "{index + 1}. {section.title}"
    // We click the visible header to open AccordionContent.
    cy.contains(new RegExp(`\\b${sectionTitle}\\b`, "i"))
        .should("be.visible")
        .click();
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

        // Global actions locked
        cy.contains("button", "Enregistrer").should("be.disabled");
        cy.contains("button", "Publier").should("be.disabled");

        // Sidebar structure actions locked (always visible)
        cy.contains("button", "+ Ajouter une section").should("be.disabled");

        // "+ Ajouter un chapitre" is inside AccordionContent -> open the section first
        openSectionAccordionByTitle("Section 1");
        cy.contains("button", "+ Ajouter un chapitre").should("be.disabled");

        // Ensure no mutation calls happened
        cy.get("@putCourse.all").should("have.length", 0);
        cy.get("@publishCourse.all").should("have.length", 0);
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

        // Global actions locked
        cy.contains("button", "Enregistrer").should("be.disabled");
        cy.contains("button", "Publier").should("be.disabled");

        // Sidebar structure actions locked (always visible)
        cy.contains("button", "+ Ajouter une section").should("be.disabled");

        // "+ Ajouter un chapitre" is inside AccordionContent -> open the section first
        openSectionAccordionByTitle("Section 1");
        cy.contains("button", "+ Ajouter un chapitre").should("be.disabled");

        // Ensure no mutation calls happened
        cy.get("@putCourse.all").should("have.length", 0);
        cy.get("@publishCourse.all").should("have.length", 0);

        // Upload behavior checks (kept resilient, based on visible UX text)
        cy.contains("button", "Persisted chapter (processing)").click();
        cy.contains(/upload|téléverser|uploader/i).should("exist");

        cy.contains("button", "Client chapter (unsaved)").click();
        cy.contains(/L’upload vidéo est désactivé tant que le cours n’est pas sauvegardé/i).should("exist");
    });
});

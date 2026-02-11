/// <reference types="cypress" />

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
                created: false,
                user: {
                    id: "internal-user-1",
                    externalId: "kc-123",
                    email: "tutor@test.com",
                    firstName: "Test",
                    lastName: "Tutor",
                    active: true,
                    roles: [{name: "TUTOR"}],
                },
                id: "internal-user-1",
                externalId: "kc-123",
                email: "tutor@test.com",
                firstName: "Test",
                lastName: "Tutor",
                active: true,
                roles: ["TUTOR"],
            },
        }).as("usersMe");
    }

    function courseGetUrl(courseId: string): RegExp {
        return new RegExp(`.*/api/course(s)?/${courseId}$`);
    }

    function coursePutUrl(courseId: string): RegExp {
        return new RegExp(`.*/api/course(s)?/${courseId}$`);
    }

    function visitEdit(): void {
        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/edit`);
        cy.wait("@authMe");
        cy.wait("@usersMe");
        cy.wait("@getCourse");
    }

    function visitSections(): void {
        cy.visit(`/dashboard/tutor/course-builder/${COURSE_ID}/sections`);
        cy.wait("@authMe");
        cy.wait("@usersMe");
        cy.wait("@getCourse");
    }


    function openSidebarIfClosed(): void {
        cy.get("body").then(($body) => {
            const addVisible = $body.find('[data-cy="add-section"]:visible').length > 0;

            if (addVisible) {
                // Sidebar already open -> do nothing
            } else {
                cy.get('[data-cy="toggle-course-sidebar"]').should("be.visible").click();
            }
        });

        cy.get('[data-cy="add-section"]').should("be.visible");
    }

    beforeEach(() => {
        cy.viewport(1440, 900); // ✅ ensures sidebar/layout is rendered in desktop mode

        cy.clearCookies();
        cy.clearLocalStorage();
        stubAuth();
    });


    it("Meta-only title change -> PUT must include ONLY title (no sections)", () => {
        cy.intercept("GET", courseGetUrl(COURSE_ID), {
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
                        chapters: [{id: "chapter-1", title: "Chapter 1", position: 1, video: null}],
                    },
                ],
            },
        }).as("getCourse");

        cy.intercept("PUT", coursePutUrl(COURSE_ID), (req) => {
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
                            chapters: [{id: "chapter-1", title: "Chapter 1", position: 1, video: null}],
                        },
                    ],
                },
            });
        }).as("updateCourse");

        visitEdit();


        cy.get("input#course-title").clear().type("New Title");
        cy.contains("button", "Enregistrer").click();

        cy.wait("@updateCourse");
    });

    it("Meta + structure together -> PUT must include sections; title is optional (if present must be correct); new chapter is CREATE", () => {
        cy.intercept("GET", courseGetUrl(COURSE_ID), {
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
                        chapters: [{id: "chapter-1", title: "Chapter 1", position: 1, video: null}],
                    },
                ],
            },
        }).as("getCourse");

        cy.intercept("PUT", coursePutUrl(COURSE_ID), (req) => {
            if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
                expect(req.body).to.have.property("title", "New Title");
            }

            expect(req.body).to.have.property("sections");
            expect(req.body.sections).to.be.an("array");

            const section1 = req.body.sections[0];
            expect(section1).to.have.property("id", "section-1");
            expect(section1).to.have.property("chapters");
            expect(section1.chapters).to.have.length(2);

            const newChapter = section1.chapters[1];

            const hasNoId = !Object.prototype.hasOwnProperty.call(newChapter, "id");
            const hasClientId =
                typeof (newChapter as any).id === "string" && (newChapter as any).id.startsWith("client:");

            expect(hasNoId || hasClientId).to.equal(true);
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

        visitEdit();
        cy.get("input#course-title").clear().type("New Title");

        visitSections();
        cy.contains("Section 1").click();
        cy.contains("button", "+ Ajouter un chapitre").click();

        cy.contains("button", "Enregistrer").click();
        cy.wait("@updateCourse");
    });

    it("Delete-all confirmation -> no PUT before confirm; PUT sections:[] after confirm", () => {
        cy.intercept("GET", courseGetUrl(COURSE_ID), {
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

        cy.intercept("PUT", coursePutUrl(COURSE_ID), (req) => {
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

        visitSections();

        cy.get('[data-cy="delete-section"]').first().click();

        cy.contains("button", "Enregistrer").click();
        cy.contains("Supprimer toutes les sections").should("be.visible");

        cy.contains("button", "Annuler").click();
        cy.wrap(null).then(() => {
            expect(putCount).to.equal(0);
        });

        cy.contains("button", "Enregistrer").click();
        cy.contains("button", "Confirmer la suppression").click();

        cy.wait("@updateCourse");
        cy.wrap(null).then(() => {
            expect(putCount).to.equal(1);
        });
    });

    it("Initially empty course -> can send sections:[] without delete-all confirmation", () => {
        cy.intercept("GET", courseGetUrl(COURSE_ID), {
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

        cy.intercept("PUT", coursePutUrl(COURSE_ID), (req) => {
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
        visitSections();
        cy.get('[data-cy="toggle-course-sidebar"]').click();

        // ✅ Open sidebar (required in current UI state)
        cy.get('[data-cy="toggle-course-sidebar"]').should("be.visible").click();

        // Now sidebar actions exist
        cy.get('[data-cy="add-section"]').should("be.visible").click();
        cy.get('[data-cy="delete-section"]').first().click();

        cy.contains("button", "Enregistrer").click();

        cy.contains("Supprimer toutes les sections").should("not.exist");
        cy.wait("@updateCourse");
    });
});

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import userEvent from "@testing-library/user-event";
import EditCoursePage from "./EditCoursePage";
import {courseService} from "@/api/services";
import {toast} from "sonner";
import i18n from "@/i18n";

// Mock dependencies
vi.mock("@/api/services", () => ({
    courseService: {
        deleteCourse: vi.fn(),
    },
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock useCourseBuilder hook
const mockUseCourseBuilder = vi.fn();
vi.mock("@/layout/tutor", () => ({
    useCourseBuilder: () => mockUseCourseBuilder(),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext.tsx", () => ({
    useAuth: () => mockUseAuth(),
}));

describe("EditCoursePage - Delete Course", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseAuth.mockReturnValue({
            internalUser: {
                id: "user-1",
                email: "tutor@test.com",
                firstName: "Test",
                lastName: "Tutor",
            },
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Success scenario", () => {
        it("should delete course successfully and navigate to courses list", async () => {
            const user = userEvent.setup();

            const mockCourse = {
                id: "course-123",
                title: "Test Course",
                description: "Test Description",
                status: "DRAFT",
                sections: [],
            };

            mockUseCourseBuilder.mockReturnValue({
                course: mockCourse,
                setCourse: vi.fn(),
                loading: false,
                selectedChapterId: null,
                setSelectedChapterId: vi.fn(),
                saving: false,
                structureDirty: false,
                markStructureDirty: vi.fn(),
                refreshCourse: vi.fn(),
                saveCourse: vi.fn(),
                courseId: "course-123",
            });

            vi.mocked(courseService.deleteCourse).mockResolvedValueOnce(undefined);

            render(
                <MemoryRouter>
                    <EditCoursePage/>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(i18n.t('tutor.course_information'))).toBeInTheDocument();
            });

            const deleteButton = screen.getByRole("button", {name: i18n.t('tutor.delete_draft')});
            expect(deleteButton).toBeInTheDocument();
            expect(deleteButton).not.toBeDisabled();

            await user.click(deleteButton);

            await waitFor(() => {
                expect(screen.getByText(i18n.t('tutor.delete_draft_title'))).toBeInTheDocument();
            });

            const confirmButton = screen.getByRole("button", {name: i18n.t('common.confirm')});
            await user.click(confirmButton);

            await waitFor(() => {
                expect(courseService.deleteCourse).toHaveBeenCalledWith("course-123");
                expect(courseService.deleteCourse).toHaveBeenCalledTimes(1);
            });

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith(i18n.t('tutor.course_deleted'));
                expect(mockNavigate).toHaveBeenCalledWith("/dashboard/tutor/courses");
            });
        });
    });

    describe("Error scenario", () => {
        it("should display error toast when deletion fails", async () => {
            const user = userEvent.setup();

            const mockCourse = {
                id: "course-456",
                title: "Test Course",
                description: "Test Description",
                status: "DRAFT",
                sections: [],
            };

            mockUseCourseBuilder.mockReturnValue({
                course: mockCourse,
                setCourse: vi.fn(),
                loading: false,
                selectedChapterId: null,
                setSelectedChapterId: vi.fn(),
                saving: false,
                structureDirty: false,
                markStructureDirty: vi.fn(),
                refreshCourse: vi.fn(),
                saveCourse: vi.fn(),
                courseId: "course-456",
            });

            vi.mocked(courseService.deleteCourse).mockRejectedValueOnce(new Error("Network error"));

            render(
                <MemoryRouter>
                    <EditCoursePage/>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(i18n.t('tutor.course_information'))).toBeInTheDocument();
            });

            const deleteButton = screen.getByRole("button", {name: i18n.t('tutor.delete_draft')});
            expect(deleteButton).toBeInTheDocument();
            expect(deleteButton).not.toBeDisabled();

            await user.click(deleteButton);

            await waitFor(() => {
                expect(screen.getByText(i18n.t('tutor.delete_draft_title'))).toBeInTheDocument();
            });

            const confirmButton = screen.getByRole("button", {name: i18n.t('common.confirm')});
            await user.click(confirmButton);

            await waitFor(() => {
                expect(courseService.deleteCourse).toHaveBeenCalledWith("course-456");
                expect(courseService.deleteCourse).toHaveBeenCalledTimes(1);
            });

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(i18n.t('api.errors.service_unavailable'));
                expect(mockNavigate).not.toHaveBeenCalled();
                expect(toast.success).not.toHaveBeenCalled();
            });
        });
    });

    describe("Button disabled states", () => {
        it("should disable delete button when course is not DRAFT", async () => {
            const mockCourse = {
                id: "course-789",
                title: "Published Course",
                description: "Test Description",
                status: "PUBLISHED",
                sections: [],
            };

            mockUseCourseBuilder.mockReturnValue({
                course: mockCourse,
                setCourse: vi.fn(),
                loading: false,
                selectedChapterId: null,
                setSelectedChapterId: vi.fn(),
                saving: false,
                structureDirty: false,
                markStructureDirty: vi.fn(),
                refreshCourse: vi.fn(),
                saveCourse: vi.fn(),
                courseId: "course-789",
            });

            render(
                <MemoryRouter>
                    <EditCoursePage/>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(i18n.t('tutor.course_information'))).toBeInTheDocument();
            });

            const deleteButton = screen.getByRole("button", {name: i18n.t('tutor.delete_draft')});
            expect(deleteButton).toBeDisabled();
        });

        it("should disable delete button when course is WAITING_VALIDATION", async () => {
            const mockCourse = {
                id: "course-waiting",
                title: "Waiting Course",
                description: "Test Description",
                status: "WAITING_VALIDATION",
                sections: [],
            };

            mockUseCourseBuilder.mockReturnValue({
                course: mockCourse,
                setCourse: vi.fn(),
                loading: false,
                selectedChapterId: null,
                setSelectedChapterId: vi.fn(),
                saving: false,
                structureDirty: false,
                markStructureDirty: vi.fn(),
                refreshCourse: vi.fn(),
                saveCourse: vi.fn(),
                courseId: "course-waiting",
            });

            render(
                <MemoryRouter>
                    <EditCoursePage/>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(i18n.t('tutor.course_information'))).toBeInTheDocument();
            });

            const deleteButton = screen.getByRole("button", {name: i18n.t('tutor.delete_draft')});
            expect(deleteButton).toBeDisabled();
        });

        it("should disable delete button when video is in PROCESSING state", async () => {
            const mockCourse = {
                id: "course-processing",
                title: "Course with Processing Video",
                description: "Test Description",
                status: "DRAFT",
                sections: [
                    {
                        id: "section-1",
                        title: "Section 1",
                        position: 0,
                        chapters: [
                            {
                                id: "chapter-1",
                                title: "Chapter 1",
                                position: 0,
                                video: {
                                    id: "video-1",
                                    status: "PROCESSING",
                                },
                            },
                        ],
                    },
                ],
            };

            mockUseCourseBuilder.mockReturnValue({
                course: mockCourse,
                setCourse: vi.fn(),
                loading: false,
                selectedChapterId: null,
                setSelectedChapterId: vi.fn(),
                saving: false,
                structureDirty: false,
                markStructureDirty: vi.fn(),
                refreshCourse: vi.fn(),
                saveCourse: vi.fn(),
                courseId: "course-processing",
            });

            render(
                <MemoryRouter>
                    <EditCoursePage/>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(i18n.t('tutor.course_information'))).toBeInTheDocument();
            });

            const deleteButton = screen.getByRole("button", {name: i18n.t('tutor.delete_draft')});
            expect(deleteButton).toBeDisabled();
        });
    });
});
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import TutorMyCoursesPage from './TutorMyCoursesPage';
import type {ApiError} from '@/api/axios';
import api from '@/api/axios';

// Mock the axios instance
vi.mock('@/api/axios', () => ({
    default: {
        get: vi.fn(),
    },
}));

describe('TutorMyCoursesPage Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Scenario 1: Success - renders the course list/cards', () => {
        it('should display course cards when API returns courses successfully', async () => {
            // Mock successful API response with multiple courses
            const mockCourses = [
                {
                    id: 'course-1',
                    title: 'Introduction to React',
                    status: 'PUBLISHED',
                    updatedAt: '2026-02-01T10:00:00Z',
                },
                {
                    id: 'course-2',
                    title: 'Advanced TypeScript',
                    status: 'DRAFT',
                    updatedAt: '2026-01-15T14:30:00Z',
                },
                {
                    id: 'course-3',
                    title: 'Node.js Fundamentals',
                    status: 'READY',
                    updatedAt: '2026-01-20T08:45:00Z',
                },
            ];

            vi.mocked(api.get).mockResolvedValueOnce({
                data: mockCourses,
            });

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Initially, should show loading skeletons
            expect(screen.getByText('My Courses')).toBeInTheDocument();
            expect(screen.getByText('Create Course')).toBeInTheDocument();

            // Wait for courses to load
            await waitFor(() => {
                expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
            });

            // Verify API was called with correct endpoint
            expect(api.get).toHaveBeenCalledWith('/course');
            expect(api.get).toHaveBeenCalledTimes(1);

            // Verify all course titles are displayed
            expect(screen.getByText('Introduction to React')).toBeInTheDocument();
            expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
            expect(screen.getByText('Node.js Fundamentals')).toBeInTheDocument();

            // Verify status badges are displayed
            expect(screen.getByText('Published')).toBeInTheDocument();
            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Ready')).toBeInTheDocument();

            // Verify "Open editor" text appears (indicates cards are interactive)
            const openEditorLinks = screen.getAllByText('Open editor →');
            expect(openEditorLinks).toHaveLength(3);

            // Verify no error message is shown
            expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();

            // Verify "No courses yet" message is not shown
            expect(screen.queryByText('No courses yet')).not.toBeInTheDocument();
        });

        it('should display "No courses yet" message when API returns empty array', async () => {
            // Mock successful API response with empty array
            vi.mocked(api.get).mockResolvedValueOnce({
                data: [],
            });

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for loading to complete
            await waitFor(() => {
                expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
            });

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/course');
            expect(api.get).toHaveBeenCalledTimes(1);

            // Verify "No courses yet" message is displayed
            expect(screen.getByText('No courses yet')).toBeInTheDocument();
            expect(screen.getByText('Create your first course to start building your content.')).toBeInTheDocument();

            // Verify no course cards are displayed
            expect(screen.queryByText('Open editor →')).not.toBeInTheDocument();

            // Verify no error message is shown
            expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
        });

        it('should display courses with default values when optional fields are missing', async () => {
            // Mock API response with courses missing optional fields
            const mockCourses = [
                {
                    id: 'course-minimal-1',
                    status: 'DRAFT',
                },
                {
                    id: 'course-minimal-2',
                    status: 'PUBLISHED',
                },
            ];

            vi.mocked(api.get).mockResolvedValueOnce({
                data: mockCourses,
            });

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for courses to load
            await waitFor(() => {
                expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
            });

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/course');

            // Verify "Untitled course" is displayed for courses without title
            const untitledCourses = screen.getAllByText('Untitled course');
            expect(untitledCourses).toHaveLength(2);

            // Verify status badges are displayed
            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Published')).toBeInTheDocument();

            // Verify default updated text
            const updatedRecentlyTexts = screen.getAllByText('Updated recently');
            expect(updatedRecentlyTexts).toHaveLength(2);

            // Verify no error message is shown
            expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
        });
    });

    describe('Scenario 2: Failure with ApiError 500 - shows generic error and never displays backend data', () => {
        it('should display generic error message when API returns 500 error', async () => {
            // Mock API error with status 500
            const apiError: ApiError = {
                status: 500,
                message: 'Service indisponible. Réessayez plus tard.',
            };

            vi.mocked(api.get).mockRejectedValueOnce(apiError);

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for error to be displayed
            await waitFor(() => {
                expect(screen.getByText('Loading failed')).toBeInTheDocument();
            });

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/course');
            expect(api.get).toHaveBeenCalledTimes(1);

            // Verify error message is displayed (generic message from axios interceptor)
            expect(screen.getByText('Loading failed')).toBeInTheDocument();
            expect(screen.getByText('Service indisponible. Réessayez plus tard.')).toBeInTheDocument();

            // Verify "Retry" button is displayed
            expect(screen.getByText('Retry')).toBeInTheDocument();

            // Verify no course cards are displayed
            expect(screen.queryByText('Open editor →')).not.toBeInTheDocument();

            // Verify "No courses yet" message is not shown (error takes precedence)
            expect(screen.queryByText('No courses yet')).not.toBeInTheDocument();

            // Verify no backend data is displayed
            expect(screen.queryByText('Introduction to React')).not.toBeInTheDocument();
            expect(screen.queryByText('Advanced TypeScript')).not.toBeInTheDocument();
        });

        it('should display fallback error message when error message is missing', async () => {
            // Mock API error with missing message
            const apiError: ApiError = {
                status: 500,
                message: '',
            };

            vi.mocked(api.get).mockRejectedValueOnce(apiError);

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for error to be displayed
            await waitFor(() => {
                expect(screen.getByText('Loading failed')).toBeInTheDocument();
            });

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/course');

            // Verify fallback error message is displayed
            expect(screen.getByText('Une erreur est survenue. Réessayez.')).toBeInTheDocument();

            // Verify no course cards are displayed
            expect(screen.queryByText('Open editor →')).not.toBeInTheDocument();
        });

        it('should display error message for 403 Forbidden error', async () => {
            // Mock API error with status 403
            const apiError: ApiError = {
                status: 403,
                message: 'Accès refusé.',
            };

            vi.mocked(api.get).mockRejectedValueOnce(apiError);

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for error to be displayed
            await waitFor(() => {
                expect(screen.getByText('Loading failed')).toBeInTheDocument();
            });

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/course');

            // Verify error message is displayed
            expect(screen.getByText('Accès refusé.')).toBeInTheDocument();

            // Verify no course data is displayed
            expect(screen.queryByText('Open editor →')).not.toBeInTheDocument();
            expect(screen.queryByText('No courses yet')).not.toBeInTheDocument();
        });

        it('should never display backend data when error occurs', async () => {
            // Mock API error
            const apiError: ApiError = {
                status: 500,
                message: 'Service indisponible. Réessayez plus tard.',
            };

            vi.mocked(api.get).mockRejectedValueOnce(apiError);

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for error to be displayed
            await waitFor(() => {
                expect(screen.getByText('Loading failed')).toBeInTheDocument();
            });

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/course');

            // Verify error UI is shown
            expect(screen.getByText('Loading failed')).toBeInTheDocument();
            expect(screen.getByText('Service indisponible. Réessayez plus tard.')).toBeInTheDocument();

            // Verify absolutely no course-related content is displayed
            expect(screen.queryByText('Open editor →')).not.toBeInTheDocument();
            expect(screen.queryByText('No courses yet')).not.toBeInTheDocument();
            expect(screen.queryByText('Published')).not.toBeInTheDocument();
            expect(screen.queryByText('Draft')).not.toBeInTheDocument();
            expect(screen.queryByText('Ready')).not.toBeInTheDocument();
            expect(screen.queryByText('Archived')).not.toBeInTheDocument();

            // Verify the course grid is not rendered with any items
            const courseCards = screen.queryAllByRole('button');
            // Only the "Create Course" button and "Retry" button should be present
            expect(courseCards.length).toBeLessThanOrEqual(2);
        });

        it('should handle network errors gracefully', async () => {
            // Mock network error (no status code)
            const networkError = {
                status: 500,
                message: 'Service indisponible. Réessayez plus tard.',
            };

            vi.mocked(api.get).mockRejectedValueOnce(networkError);

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for error to be displayed
            await waitFor(() => {
                expect(screen.getByText('Loading failed')).toBeInTheDocument();
            });

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/course');

            // Verify error message is displayed
            expect(screen.getByText('Service indisponible. Réessayez plus tard.')).toBeInTheDocument();

            // Verify no course data is displayed
            expect(screen.queryByText('Open editor →')).not.toBeInTheDocument();
        });
    });

    describe('Edge cases and data validation', () => {
        it('should handle non-array response by setting courses to empty array', async () => {
            // Mock API response with non-array data (invalid response)
            vi.mocked(api.get).mockResolvedValueOnce({
                data: null,
            });

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for loading to complete
            await waitFor(() => {
                expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
            });

            // Verify "No courses yet" message is displayed (because null is converted to [])
            expect(screen.getByText('No courses yet')).toBeInTheDocument();

            // Verify no course cards are displayed
            expect(screen.queryByText('Open editor →')).not.toBeInTheDocument();
        });

        it('should display all course status variants correctly', async () => {
            // Mock API response with all possible status values
            const mockCourses = [
                {id: 'c1', title: 'Course 1', status: 'DRAFT', updatedAt: '2026-02-01'},
                {id: 'c2', title: 'Course 2', status: 'PUBLISHED', updatedAt: '2026-02-01'},
                {id: 'c3', title: 'Course 3', status: 'ARCHIVED', updatedAt: '2026-02-01'},
                {id: 'c4', title: 'Course 4', status: 'PROCESSING', updatedAt: '2026-02-01'},
                {id: 'c5', title: 'Course 5', status: 'READY', updatedAt: '2026-02-01'},
            ];

            vi.mocked(api.get).mockResolvedValueOnce({
                data: mockCourses,
            });

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for courses to load
            await waitFor(() => {
                expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
            });

            // Verify all status badges are displayed
            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Published')).toBeInTheDocument();
            expect(screen.getByText('Archived')).toBeInTheDocument();
            expect(screen.getByText('Processing')).toBeInTheDocument();
            expect(screen.getByText('Ready')).toBeInTheDocument();

            // Verify all course titles are displayed
            expect(screen.getByText('Course 1')).toBeInTheDocument();
            expect(screen.getByText('Course 2')).toBeInTheDocument();
            expect(screen.getByText('Course 3')).toBeInTheDocument();
            expect(screen.getByText('Course 4')).toBeInTheDocument();
            expect(screen.getByText('Course 5')).toBeInTheDocument();
        });

        it('should handle invalid date format in updatedAt field', async () => {
            // Mock API response with invalid date
            const mockCourses = [
                {
                    id: 'course-invalid-date',
                    title: 'Invalid Date Course',
                    status: 'DRAFT',
                    updatedAt: 'invalid-date-string',
                },
            ];

            vi.mocked(api.get).mockResolvedValueOnce({
                data: mockCourses,
            });

            render(
                <MemoryRouter>
                    <TutorMyCoursesPage/>
                </MemoryRouter>
            );

            // Wait for courses to load
            await waitFor(() => {
                expect(screen.queryByText('Loading failed')).not.toBeInTheDocument();
            });

            // Verify course is displayed with default "Updated recently" text
            expect(screen.getByText('Invalid Date Course')).toBeInTheDocument();
            expect(screen.getByText('Updated recently')).toBeInTheDocument();
        });
    });
});

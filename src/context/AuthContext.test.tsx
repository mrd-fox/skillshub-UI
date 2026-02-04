import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import {AuthProvider, useAuth} from './AuthContext';
import type {ApiError} from '@/api/axios';
import api from '@/api/axios';

// Mock the axios instance
vi.mock('@/api/axios', () => ({
    default: {
        get: vi.fn(),
    },
}));

describe('AuthContext Integration Tests', () => {
    let originalLocation: Location;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock globalThis.location.assign
        originalLocation = window.location;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).location = {
            ...window.location,
            assign: vi.fn(),
        };

        // Set VITE_API_URL
        vi.stubEnv('VITE_API_URL', 'http://localhost:8080/api');
    });

    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).location = originalLocation;
        vi.unstubAllEnvs();
    });

    describe('Scenario 1: Successful authentication with role resolution', () => {
        it('should set isAuthenticated=true, internalUser, roles, and activeRole=ADMIN when user has ADMIN role', async () => {
            // Mock successful responses
            const mockAuthUser = {
                id: 'auth-123',
                email: 'admin@test.com',
                roles: ['ADMIN', 'TUTOR', 'STUDENT'],
            };

            const mockInternalUserEnvelope = {
                created: false,
                user: {
                    id: 'internal-123',
                    externalId: 'keycloak-123',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'admin@test.com',
                    active: true,
                    roles: [
                        {name: 'ADMIN'},
                        {name: 'TUTOR'},
                        {name: 'STUDENT'},
                    ],
                },
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.resolve({data: mockInternalUserEnvelope});
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            // Test component that uses the context
            const TestComponent = () => {
                const {loading, isAuthenticated, internalUser, roles, activeRole} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="user-email">{internalUser?.email || 'none'}</div>
                        <div data-testid="user-id">{internalUser?.id || 'none'}</div>
                        <div data-testid="keycloak-id">{internalUser?.keycloakId || 'none'}</div>
                        <div data-testid="first-name">{internalUser?.firstName || 'none'}</div>
                        <div data-testid="last-name">{internalUser?.lastName || 'none'}</div>
                        <div data-testid="active">{internalUser?.active ? 'true' : 'false'}</div>
                        <div data-testid="roles">{roles.join(',')}</div>
                        <div data-testid="active-role">{activeRole || 'none'}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            // Initially loading
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            // Wait for authentication to complete
            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Verify isAuthenticated is true
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');

            // Verify internalUser is set correctly
            expect(screen.getByTestId('user-email')).toHaveTextContent('admin@test.com');
            expect(screen.getByTestId('user-id')).toHaveTextContent('internal-123');
            expect(screen.getByTestId('keycloak-id')).toHaveTextContent('keycloak-123');
            expect(screen.getByTestId('first-name')).toHaveTextContent('John');
            expect(screen.getByTestId('last-name')).toHaveTextContent('Doe');
            expect(screen.getByTestId('active')).toHaveTextContent('true');

            // Verify roles are extracted
            expect(screen.getByTestId('roles')).toHaveTextContent('ADMIN,TUTOR,STUDENT');

            // Verify activeRole is ADMIN (highest priority)
            expect(screen.getByTestId('active-role')).toHaveTextContent('ADMIN');

            // Verify API calls were made
            expect(api.get).toHaveBeenCalledWith('/auth/me');
            expect(api.get).toHaveBeenCalledWith('/users/me');
            expect(api.get).toHaveBeenCalledTimes(2);
        });

        it('should set activeRole=TUTOR when user has TUTOR and STUDENT roles (no ADMIN)', async () => {
            const mockAuthUser = {
                id: 'auth-456',
                email: 'tutor@test.com',
                roles: ['TUTOR', 'STUDENT'],
            };

            const mockInternalUserEnvelope = {
                created: true,
                user: {
                    id: 'internal-456',
                    externalId: 'keycloak-456',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'tutor@test.com',
                    active: true,
                    roles: [
                        {name: 'TUTOR'},
                        {name: 'STUDENT'},
                    ],
                },
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.resolve({data: mockInternalUserEnvelope});
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            const TestComponent = () => {
                const {loading, isAuthenticated, activeRole, roles} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="roles">{roles.join(',')}</div>
                        <div data-testid="active-role">{activeRole || 'none'}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('roles')).toHaveTextContent('TUTOR,STUDENT');
            expect(screen.getByTestId('active-role')).toHaveTextContent('TUTOR');
        });

        it('should set activeRole=STUDENT when user has only STUDENT role', async () => {
            const mockAuthUser = {
                id: 'auth-789',
                email: 'student@test.com',
                roles: ['STUDENT'],
            };

            const mockInternalUserEnvelope = {
                created: false,
                user: {
                    id: 'internal-789',
                    externalId: 'keycloak-789',
                    firstName: 'Bob',
                    lastName: null,
                    email: 'student@test.com',
                    active: true,
                    roles: [
                        {name: 'STUDENT'},
                    ],
                },
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.resolve({data: mockInternalUserEnvelope});
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            const TestComponent = () => {
                const {loading, isAuthenticated, activeRole, roles, internalUser} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="roles">{roles.join(',')}</div>
                        <div data-testid="active-role">{activeRole || 'none'}</div>
                        <div data-testid="first-name">{internalUser?.firstName || 'none'}</div>
                        <div data-testid="last-name">{internalUser?.lastName || 'none'}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('roles')).toHaveTextContent('STUDENT');
            expect(screen.getByTestId('active-role')).toHaveTextContent('STUDENT');
            expect(screen.getByTestId('first-name')).toHaveTextContent('Bob');
            expect(screen.getByTestId('last-name')).toHaveTextContent('none');
        });

        it('should set activeRole=null when user has no standard roles', async () => {
            const mockAuthUser = {
                id: 'auth-000',
                email: 'norole@test.com',
                roles: [],
            };

            const mockInternalUserEnvelope = {
                created: false,
                user: {
                    id: 'internal-000',
                    externalId: 'keycloak-000',
                    firstName: null,
                    lastName: null,
                    email: 'norole@test.com',
                    active: false,
                    roles: [],
                },
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.resolve({data: mockInternalUserEnvelope});
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            const TestComponent = () => {
                const {loading, isAuthenticated, activeRole, roles} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="roles">{roles.length === 0 ? 'empty' : roles.join(',')}</div>
                        <div data-testid="active-role">{activeRole || 'none'}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('roles')).toHaveTextContent('empty');
            expect(screen.getByTestId('active-role')).toHaveTextContent('none');
        });
    });

    describe('Scenario 2: Authentication failure (401 error)', () => {
        it('should set isAuthenticated=false, internalUser=null, activeRole=null when /auth/me returns 401', async () => {
            // Mock 401 error from /auth/me
            const apiError: ApiError = {
                status: 401,
                message: 'Votre session a expiré. Veuillez vous reconnecter.',
            };

            vi.mocked(api.get).mockRejectedValue(apiError);

            const TestComponent = () => {
                const {loading, isAuthenticated, internalUser, activeRole, roles} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="internal-user">{internalUser ? 'present' : 'null'}</div>
                        <div data-testid="active-role">{activeRole || 'null'}</div>
                        <div data-testid="roles">{roles.length === 0 ? 'empty' : roles.join(',')}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            // Initially loading
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            // Wait for authentication to fail
            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Verify isAuthenticated is false
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');

            // Verify internalUser is null
            expect(screen.getByTestId('internal-user')).toHaveTextContent('null');

            // Verify activeRole is null
            expect(screen.getByTestId('active-role')).toHaveTextContent('null');

            // Verify roles is empty
            expect(screen.getByTestId('roles')).toHaveTextContent('empty');

            // Verify API was called
            expect(api.get).toHaveBeenCalledWith('/auth/me');
            expect(api.get).toHaveBeenCalledTimes(1);
        });

        it('should handle 401 error on /users/me after successful /auth/me', async () => {
            const mockAuthUser = {
                id: 'auth-999',
                email: 'test@test.com',
                roles: ['STUDENT'],
            };

            const apiError: ApiError = {
                status: 401,
                message: 'Votre session a expiré. Veuillez vous reconnecter.',
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.reject(apiError);
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            const TestComponent = () => {
                const {loading, isAuthenticated, internalUser, activeRole, roles, profileError} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="internal-user">{internalUser ? 'present' : 'null'}</div>
                        <div data-testid="active-role">{activeRole || 'null'}</div>
                        <div data-testid="roles">{roles.length === 0 ? 'empty' : roles.join(',')}</div>
                        <div data-testid="profile-error">{profileError ? profileError.status : 'null'}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Session is valid (auth/me succeeded) but profile is unauthorized
            // This is the correct behavior: user is authenticated but cannot access internal profile
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('internal-user')).toHaveTextContent('null');
            expect(screen.getByTestId('active-role')).toHaveTextContent('null');
            expect(screen.getByTestId('roles')).toHaveTextContent('empty');
            expect(screen.getByTestId('profile-error')).toHaveTextContent('401');

            // Verify both API calls were attempted
            expect(api.get).toHaveBeenCalledWith('/auth/me');
            expect(api.get).toHaveBeenCalledWith('/users/me');
            expect(api.get).toHaveBeenCalledTimes(2);
        });

        it('should handle non-401 ApiError gracefully', async () => {
            const apiError: ApiError = {
                status: 500,
                message: 'Service indisponible. Réessayez plus tard.',
            };

            vi.mocked(api.get).mockRejectedValue(apiError);

            const TestComponent = () => {
                const {loading, isAuthenticated, internalUser, activeRole} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="internal-user">{internalUser ? 'present' : 'null'}</div>
                        <div data-testid="active-role">{activeRole || 'null'}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
            expect(screen.getByTestId('internal-user')).toHaveTextContent('null');
            expect(screen.getByTestId('active-role')).toHaveTextContent('null');
        });

        it('should handle technical error (503) on /users/me after successful /auth/me', async () => {
            const mockAuthUser = {
                id: 'auth-tech',
                email: 'tech@test.com',
                roles: ['STUDENT'],
            };

            const apiError: ApiError = {
                status: 503,
                message: 'Service indisponible. Réessayez plus tard.',
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.reject(apiError);
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            const TestComponent = () => {
                const {loading, isAuthenticated, internalUser, activeRole, roles, profileError, authError} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return (
                    <div>
                        <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
                        <div data-testid="internal-user">{internalUser ? 'present' : 'null'}</div>
                        <div data-testid="active-role">{activeRole || 'null'}</div>
                        <div data-testid="roles">{roles.length === 0 ? 'empty' : roles.join(',')}</div>
                        <div data-testid="profile-error">{profileError ? profileError.status : 'null'}</div>
                        <div data-testid="auth-error">{authError ? authError.status : 'null'}</div>
                    </div>
                );
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Technical error on profile: session remains authenticated but profile is unavailable
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('internal-user')).toHaveTextContent('null');
            expect(screen.getByTestId('active-role')).toHaveTextContent('null');
            expect(screen.getByTestId('roles')).toHaveTextContent('empty');
            expect(screen.getByTestId('profile-error')).toHaveTextContent('503');
            expect(screen.getByTestId('auth-error')).toHaveTextContent('null');

            // Verify both API calls were attempted
            expect(api.get).toHaveBeenCalledWith('/auth/me');
            expect(api.get).toHaveBeenCalledWith('/users/me');
            expect(api.get).toHaveBeenCalledTimes(2);
        });
    });

    describe('Context utility functions', () => {
        it('should provide login function that redirects to API_ROOT/auth/login', () => {
            const TestComponent = () => {
                const {login} = useAuth();
                return <button onClick={login}>Login</button>;
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            const button = screen.getByRole('button', {name: 'Login'});
            button.click();

            expect(globalThis.location.assign).toHaveBeenCalledWith('http://localhost:8080/api/auth/login');
        });

        it('should provide logout function that redirects to API_ROOT/auth/logout', () => {
            const TestComponent = () => {
                const {logout} = useAuth();
                return <button onClick={logout}>Logout</button>;
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            const button = screen.getByRole('button', {name: 'Logout'});
            button.click();

            expect(globalThis.location.assign).toHaveBeenCalledWith('http://localhost:8080/api/auth/logout');
        });

        it('should throw error when useAuth is called outside AuthProvider', () => {
            const TestComponent = () => {
                useAuth();
                return <div>Test</div>;
            };

            // Suppress expected error in console
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
            });

            expect(() => render(<TestComponent/>)).toThrow(
                'useAuth must be used within AuthProvider'
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Role priority resolution', () => {
        it('should prioritize ADMIN > TUTOR > STUDENT when all roles are present', async () => {
            const mockAuthUser = {
                id: 'auth-priority',
                email: 'priority@test.com',
                roles: ['STUDENT', 'TUTOR', 'ADMIN'],
            };

            const mockInternalUserEnvelope = {
                created: false,
                user: {
                    id: 'internal-priority',
                    externalId: 'keycloak-priority',
                    firstName: 'Priority',
                    lastName: 'Test',
                    email: 'priority@test.com',
                    active: true,
                    roles: [
                        {name: 'STUDENT'},
                        {name: 'TUTOR'},
                        {name: 'ADMIN'},
                    ],
                },
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.resolve({data: mockInternalUserEnvelope});
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            const TestComponent = () => {
                const {loading, activeRole} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return <div data-testid="active-role">{activeRole || 'none'}</div>;
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Should resolve to ADMIN (highest priority)
            expect(screen.getByTestId('active-role')).toHaveTextContent('ADMIN');
        });

        it('should resolve to TUTOR when ADMIN is not present but TUTOR and STUDENT are', async () => {
            const mockAuthUser = {
                id: 'auth-tutor-priority',
                email: 'tutorpriority@test.com',
                roles: ['STUDENT', 'TUTOR'],
            };

            const mockInternalUserEnvelope = {
                created: false,
                user: {
                    id: 'internal-tutor-priority',
                    externalId: 'keycloak-tutor-priority',
                    firstName: 'Tutor',
                    lastName: 'Priority',
                    email: 'tutorpriority@test.com',
                    active: true,
                    roles: [
                        {name: 'STUDENT'},
                        {name: 'TUTOR'},
                    ],
                },
            };

            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url === '/auth/me') {
                    return Promise.resolve({data: mockAuthUser});
                }
                if (url === '/users/me') {
                    return Promise.resolve({data: mockInternalUserEnvelope});
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            const TestComponent = () => {
                const {loading, activeRole} = useAuth();

                if (loading) {
                    return <div>Loading...</div>;
                }

                return <div data-testid="active-role">{activeRole || 'none'}</div>;
            };

            render(
                <AuthProvider>
                    <TestComponent/>
                </AuthProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Should resolve to TUTOR
            expect(screen.getByTestId('active-role')).toHaveTextContent('TUTOR');
        });
    });
});

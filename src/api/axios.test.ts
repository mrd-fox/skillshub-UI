import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import axios from 'axios';
import {toast} from 'sonner';
import type {ApiError} from './axios';

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        warning: vi.fn(),
    },
}));

// Mock axios
vi.mock('axios');

describe('axios API interceptor', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAxiosInstance: any;
    let originalLocation: Location;

    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();

        // Mock window.location
        originalLocation = window.location;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).location;
        window.location = {
            href: '',
        } as Location;

        // Create a mock axios instance
        mockAxiosInstance = {
            create: vi.fn(() => mockAxiosInstance),
            interceptors: {
                response: {
                    use: vi.fn(),
                },
            },
            withCredentials: true,
        };

        // Mock axios.create to return our mock instance
        vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);

        // Re-import the module to apply mocks and reset sessionExpiredHandled flag
        vi.resetModules();
    });

    afterEach(() => {
        // Restore window.location
        window.location = originalLocation;
    });

    describe('401 Unauthorized errors', () => {
        it('should reject with ApiError containing status 401 and sanitized message', async () => {
            // Re-import to get fresh instance with reset flag
            await import('./axios');

            const axiosError = {
                response: {
                    status: 401,
                    data: {sensitiveData: 'backend secret message'},
                },
            };

            // Get the error handler
            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(401);
                expect(apiError.message).toBe('Votre session a expiré. Veuillez vous reconnecter.');
                expect(apiError.message).not.toContain('backend secret message');
                expect(apiError.message).not.toContain('sensitiveData');
            }
        });

        it('should call toast.warning exactly once on first 401 error', async () => {
            // Re-import to get fresh instance with reset flag
            await import('./axios');

            const axiosError = {
                response: {
                    status: 401,
                },
            };

            // Get the error handler
            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            // First 401 error
            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            expect(toast.warning).toHaveBeenCalledTimes(1);
            expect(toast.warning).toHaveBeenCalledWith('Votre session a expiré. Veuillez vous reconnecter.');
        });

        it('should NOT call toast.warning on subsequent 401 errors (anti-spam)', async () => {
            // Re-import to get fresh instance with reset flag
            await import('./axios');

            const axiosError = {
                response: {
                    status: 401,
                },
            };

            // Get the error handler
            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            // First 401 error
            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            expect(toast.warning).toHaveBeenCalledTimes(1);

            // Second 401 error
            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            // Third 401 error
            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            // Still only called once
            expect(toast.warning).toHaveBeenCalledTimes(1);
        });

        it('should redirect to login URL exactly once on first 401 error', async () => {
            // Set VITE_API_URL for this test
            vi.stubEnv('VITE_API_URL', 'http://localhost:8080/api');

            // Re-import to get fresh instance with reset flag and new env
            await import('./axios');

            const axiosError = {
                response: {
                    status: 401,
                },
            };

            // Get the error handler
            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            // First 401 error
            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            expect(window.location.href).toBe('http://localhost:8080/api/auth/login');

            // Reset href to test it doesn't change again
            window.location.href = '';

            // Second 401 error
            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            // Should NOT redirect again
            expect(window.location.href).toBe('');

            vi.unstubAllEnvs();
        });
    });

    describe('403 Forbidden errors', () => {
        it('should reject with ApiError containing status 403 and sanitized message', async () => {
            await import('./axios');

            const axiosError = {
                response: {
                    status: 403,
                    data: {backendMessage: 'You shall not pass'},
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(403);
                expect(apiError.message).toBe('Accès refusé.');
                expect(apiError.message).not.toContain('You shall not pass');
            }
        });

        it('should NOT call toast.warning for 403 errors', async () => {
            await import('./axios');

            const axiosError = {
                response: {
                    status: 403,
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            expect(toast.warning).not.toHaveBeenCalled();
        });

        it('should NOT redirect for 403 errors', async () => {
            vi.stubEnv('VITE_API_URL', 'http://localhost:8080/api');
            await import('./axios');

            const axiosError = {
                response: {
                    status: 403,
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            expect(window.location.href).toBe('');

            vi.unstubAllEnvs();
        });
    });

    describe('5xx Server errors', () => {
        it('should reject with ApiError containing status 500 and generic message', async () => {
            await import('./axios');

            const axiosError = {
                response: {
                    status: 500,
                    data: {error: 'Internal server crashed'},
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(500);
                expect(apiError.message).toBe('Service indisponible. Réessayez plus tard.');
                expect(apiError.message).not.toContain('crashed');
            }
        });

        it('should handle 503 Service Unavailable with same message as 500', async () => {
            await import('./axios');

            const axiosError = {
                response: {
                    status: 503,
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(503);
                expect(apiError.message).toBe('Service indisponible. Réessayez plus tard.');
            }
        });
    });

    describe('Other HTTP errors', () => {
        it('should reject with ApiError containing status 400 and generic message', async () => {
            await import('./axios');

            const axiosError = {
                response: {
                    status: 400,
                    data: {validationErrors: ['field1 is required']},
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(400);
                expect(apiError.message).toBe('Une erreur est survenue. Réessayez.');
                expect(apiError.message).not.toContain('required');
            }
        });

        it('should handle 404 Not Found with generic message', async () => {
            await import('./axios');

            const axiosError = {
                response: {
                    status: 404,
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(404);
                expect(apiError.message).toBe('Une erreur est survenue. Réessayez.');
            }
        });
    });

    describe('Network errors (no response)', () => {
        it('should reject with ApiError status 500 when response is undefined', async () => {
            await import('./axios');

            const axiosError = {
                response: undefined,
                message: 'Network Error',
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(500);
                expect(apiError.message).toBe('Service indisponible. Réessayez plus tard.');
            }
        });

        it('should handle invalid status gracefully', async () => {
            await import('./axios');

            const axiosError = {
                response: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    status: 'invalid' as any,
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
                expect.fail('Should have rejected');
            } catch (error) {
                const apiError = error as ApiError;
                expect(apiError.status).toBe(500);
                expect(apiError.message).toBe('Service indisponible. Réessayez plus tard.');
            }
        });
    });

    describe('Success responses', () => {
        it('should pass through successful responses unchanged', async () => {
            await import('./axios');

            const successResponse = {
                data: {message: 'Success'},
                status: 200,
                statusText: 'OK',
                headers: {},
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                config: {} as any,
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const successHandler = useCall[0];

            const result = await successHandler(successResponse);

            expect(result).toEqual(successResponse);
            expect(toast.warning).not.toHaveBeenCalled();
        });
    });

    describe('Configuration', () => {
        it('should create axios instance with correct baseURL and withCredentials', async () => {
            vi.stubEnv('VITE_API_URL', 'http://localhost:8080/api');

            // Force re-import to apply env
            vi.resetModules();
            await import('./axios');

            expect(axios.create).toHaveBeenCalledWith({
                baseURL: 'http://localhost:8080/api',
                withCredentials: true,
            });

            vi.unstubAllEnvs();
        });

        it('should log error when VITE_API_URL is missing', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
            });

            vi.stubEnv('VITE_API_URL', undefined);
            vi.resetModules();
            await import('./axios');

            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ VITE_API_URL is missing or invalid');

            consoleErrorSpy.mockRestore();
            vi.unstubAllEnvs();
        });

        it('should not redirect when VITE_API_URL is missing on 401', async () => {
            vi.stubEnv('VITE_API_URL', undefined);
            vi.resetModules();
            await import('./axios');

            const axiosError = {
                response: {
                    status: 401,
                },
            };

            const createCall = vi.mocked(axios.create).mock.results[0];
            const useCall = createCall.value.interceptors.response.use.mock.calls[0];
            const errorHandler = useCall[1];

            try {
                await errorHandler(axiosError);
            } catch {
                // Expected to reject
            }

            expect(window.location.href).toBe('');

            vi.unstubAllEnvs();
        });
    });
});

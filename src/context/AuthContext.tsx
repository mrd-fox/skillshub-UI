import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import api, {ApiError} from "@/api/axios";

export interface AuthContextType {
    loading: boolean;

    // Auth (Gateway/Keycloak)
    isAuthenticated: boolean;
    authUser: AuthUser | null;

    // Profile (User-service via Gateway)
    internalUser: InternalUser | null;
    setInternalUser: (u: InternalUser | null) => void;

    roles: string[];
    activeRole: string | null;
    setActiveRole: (r: string | null) => void;

    login: () => void;
    logout: () => void;

    /**
     * Technical outage when checking the session (auth endpoints: /auth/me)
     * This must NOT trigger login automatically.
     */
    authError: ApiError | null;

    /**
     * Technical outage when loading the internal profile (profile endpoints: /users/me)
     * Session may still be valid.
     */
    profileError: ApiError | null;

    clearAuthError: () => void;
    clearProfileError: () => void;

    /**
     * Explicit retry for the full bootstrap sequence (auth + profile).
     */
    retryBootstrap: () => void;
}

interface AuthUser {
    id: string;
    email: string;
    roles: string[];
}

interface RoleResponse {
    name: string;
}

interface InternalUserResponse {
    id: string;
    externalId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    active: boolean;
    roles: RoleResponse[];
}

interface InternalUserEnvelope {
    created: boolean;
    user: InternalUserResponse;
}

interface InternalUser {
    id: string;
    keycloakId: string;
    email: string;
    roles: string[];
    firstName?: string | null;
    lastName?: string | null;
    active?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
    const API_ROOT = import.meta.env.VITE_API_URL;

    const [loading, setLoading] = useState(true);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);

    const [internalUser, setInternalUser] = useState<InternalUser | null>(null);

    const [activeRole, setActiveRole] = useState<string | null>(null);

    const [authError, setAuthError] = useState<ApiError | null>(null);
    const [profileError, setProfileError] = useState<ApiError | null>(null);

    const [bootstrapNonce, setBootstrapNonce] = useState(0);

    // Flag to prevent bootstrap during logout process (persist across reloads)
    const [isLoggingOut, setIsLoggingOut] = useState(() => {
        return globalThis.sessionStorage?.getItem("isLoggingOut") === "true";
    });

    // Keep latest isLoggingOut in a ref to check in bootstrap without triggering re-renders
    const isLoggingOutRef = useRef<boolean>(isLoggingOut);
    useEffect(() => {
        isLoggingOutRef.current = isLoggingOut;
    }, [isLoggingOut]);

    // Keep latest activeRole to avoid stale closure in bootstrap.
    const activeRoleRef = useRef<string | null>(null);
    useEffect(() => {
        activeRoleRef.current = activeRole;
    }, [activeRole]);

    const roles = useMemo(() => {
        if (internalUser && Array.isArray(internalUser.roles)) {
            return internalUser.roles;
        } else {
            return [];
        }
    }, [internalUser]);

    const resolveDefaultRole = (currentRoles: string[]) => {
        if (currentRoles.includes("ADMIN")) {
            return "ADMIN";
        } else if (currentRoles.includes("TUTOR")) {
            return "TUTOR";
        } else if (currentRoles.includes("STUDENT")) {
            return "STUDENT";
        } else {
            return null;
        }
    };

    function resetAllState(): void {
        setIsAuthenticated(false);
        setAuthUser(null);
        setInternalUser(null);
        setActiveRole(null);
        setLoading(false);
    }

    function isAuthFailure(err: ApiError): boolean {
        return err.status === 401 || err.status === 403;
    }

    function isTechnicalFailure(err: ApiError): boolean {
        return err.status >= 500;
    }

    const login = useCallback(() => {
        // Clear logout flag to allow bootstrap after login redirect
        setIsLoggingOut(false);
        globalThis.sessionStorage?.removeItem("isLoggingOut");

        globalThis.location.assign(`${API_ROOT}/auth/login`);
    }, [API_ROOT]);

    const logout = useCallback(() => {
        // Set flag to prevent bootstrap on page reload after logout
        setIsLoggingOut(true);
        globalThis.sessionStorage?.setItem("isLoggingOut", "true");

        // Reset all state immediately
        resetAllState();

        // Clear errors
        setAuthError(null);
        setProfileError(null);

        // Redirect to backend logout endpoint
        globalThis.location.assign(`${API_ROOT}/auth/logout`);
    }, [API_ROOT]);

    const clearAuthError = useCallback(() => {
        setAuthError(null);
    }, []);

    const clearProfileError = useCallback(() => {
        setProfileError(null);
    }, []);

    const retryBootstrap = useCallback(() => {
        setBootstrapNonce((n) => n + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            // Do not bootstrap if user is logging out (check ref for latest value)
            if (isLoggingOutRef.current) {
                setLoading(false);
                return;
            }

            setLoading(true);

            // -------------------------
            // Phase 1: session (/auth/me)
            // -------------------------
            try {
                const authRes = await api.get<AuthUser>("/auth/me");

                if (cancelled) {
                    return;
                }

                setAuthError(null);
                setAuthUser(authRes.data);
                setIsAuthenticated(true);

                // IMPORTANT: clear logout flag using the REF (not the state closure)
                if (isLoggingOutRef.current) {
                    setIsLoggingOut(false);
                    globalThis.sessionStorage?.removeItem("isLoggingOut");
                }
            } catch (e) {
                const err = e as ApiError;

                if (cancelled) {
                    return;
                }

                if (isAuthFailure(err)) {
                    resetAllState();
                    setLoading(false);
                    return;
                }

                if (isTechnicalFailure(err)) {
                    setAuthError(err);
                } else {
                    setAuthError({status: 500, message: "Service indisponible. Réessayez plus tard."});
                }

                setLoading(false);
                return;
            }

            if (cancelled) {
                return;
            }

            // -------------------------
            // Phase 2: profile (/users/me)
            // -------------------------
            try {
                const userRes = await api.get<InternalUserEnvelope>("/users/me");

                if (cancelled) {
                    return;
                }

                setProfileError(null);

                const envelope = userRes.data;
                const user = envelope.user;

                const assignedRoles = (user.roles ?? []).map((r) => r.name);

                const mappedInternal: InternalUser = {
                    id: user.id,
                    keycloakId: user.externalId,
                    email: user.email,
                    roles: assignedRoles,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    active: user.active,
                };

                setInternalUser(mappedInternal);

                const defaultRole = resolveDefaultRole(assignedRoles);
                const currentActiveRole = activeRoleRef.current;

                if (defaultRole && (!currentActiveRole || !assignedRoles.includes(currentActiveRole))) {
                    setActiveRole(defaultRole);
                }

                setLoading(false);
            } catch (e) {
                const err = e as ApiError;

                if (cancelled) {
                    return;
                }

                if (isAuthFailure(err)) {
                    setInternalUser(null);
                    setProfileError(err);
                    setLoading(false);
                    return;
                }

                if (isTechnicalFailure(err)) {
                    setInternalUser(null);
                    setProfileError(err);
                } else {
                    setInternalUser(null);
                    setProfileError({status: 500, message: "Service indisponible. Réessayez plus tard."});
                }

                setLoading(false);
            }
        }

        bootstrap();

        return () => {
            cancelled = true;
        };
    }, [bootstrapNonce]);

    useEffect(() => {
        if (!internalUser) {
            return;
        }

        const currentRoles = internalUser.roles ?? [];
        if (currentRoles.length === 0) {
            return;
        }

        const defaultRole = resolveDefaultRole(currentRoles);

        if (!activeRole && defaultRole) {
            setActiveRole(defaultRole);
        } else if (activeRole && !currentRoles.includes(activeRole) && defaultRole) {
            setActiveRole(defaultRole);
        }
    }, [internalUser, activeRole]);

    const value = useMemo(
        () => ({
            loading,
            isAuthenticated,
            authUser,
            internalUser,
            setInternalUser,
            roles,
            activeRole,
            setActiveRole,
            login,
            logout,
            authError,
            profileError,
            clearAuthError,
            clearProfileError,
            retryBootstrap,
        }),
        [loading, isAuthenticated, authUser, internalUser, roles, activeRole, authError, profileError, login, logout, clearAuthError, clearProfileError, retryBootstrap]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}

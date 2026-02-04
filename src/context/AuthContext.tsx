import {createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState} from "react";
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

    const login = () => {
        globalThis.location.assign(`${API_ROOT}/auth/login`);
    };

    const logout = () => {
        globalThis.location.assign(`${API_ROOT}/auth/logout`);
    };

    const clearAuthError = () => {
        setAuthError(null);
    };

    const clearProfileError = () => {
        setProfileError(null);
    };

    const retryBootstrap = () => {
        setBootstrapNonce((n) => n + 1);
    };

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
    }

    function isAuthFailure(err: ApiError): boolean {
        return err.status === 401 || err.status === 403;
    }

    function isTechnicalFailure(err: ApiError): boolean {
        // ApiError.status comes from axios interceptor mapping.
        // 5xx and generic 500 for network errors are treated as technical failures.
        return err.status >= 500;
    }

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            setLoading(true);

            // -------------------------
            // Phase 1: session (/auth/me)
            // -------------------------
            try {
                const authRes = await api.get<AuthUser>("/auth/me");

                if (cancelled) {
                    return;
                }

                // Clear auth error only on successful auth check
                setAuthError(null);
                setAuthUser(authRes.data);
                setIsAuthenticated(true);
            } catch (e) {
                const err = e as ApiError;

                if (cancelled) {
                    return;
                }

                if (isAuthFailure(err)) {
                    // Session invalid -> reset state.
                    // 401 redirect is handled in axios interceptor (toast + redirect).
                    resetAllState();
                    setLoading(false);
                    return;
                }

                // Technical outage: session unknown. Do NOT reset/redirect.
                // Keep previous state to avoid false logout + redirect loops.
                if (isTechnicalFailure(err)) {
                    setAuthError(err);
                } else {
                    // Any other unexpected error: treat as technical.
                    setAuthError({status: 500, message: "Service indisponible. Réessayez plus tard."});
                }

                setLoading(false);
                return;
            }

            // If session is OK, continue
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

                // Clear profile error only on successful profile fetch
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

                // Choose a default role if missing/invalid
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

                // Profile unauthorized while session is OK:
                // user must NOT be redirected to login. We'll handle it in ProtectedRoute (unauthorized screen).
                if (isAuthFailure(err)) {
                    setInternalUser(null);
                    setProfileError(err);
                    setLoading(false);
                    return;
                }

                // Technical outage on profile: keep session authenticated, expose profileError.
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
    }, [API_ROOT, bootstrapNonce]);

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
        [loading, isAuthenticated, authUser, internalUser, roles, activeRole, authError, profileError]
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

import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import api, {ApiError} from "@/api/axios";

export interface AuthContextType {
    loading: boolean;
    isAuthenticated: boolean;
    authUser: AuthUser | null;
    internalUser: InternalUser | null;
    setInternalUser: (u: InternalUser | null) => void;
    roles: string[];
    activeRole: string | null;
    setActiveRole: (r: string | null) => void;
    login: () => void;
    logout: () => void;
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

    const roles = useMemo(() => {
        if (internalUser && Array.isArray(internalUser.roles)) {
            return internalUser.roles;
        } else {
            return [];
        }
    }, [internalUser]);

    const login = () => {
        // window.location.href = `${API_ROOT}/auth/login`;
        window.location.assign(`${API_ROOT}/auth/login`);
    };

    const logout = () => {
        // window.location.href = `${API_ROOT}/auth/logout`;
        window.location.assign(`${API_ROOT}/auth/logout`);
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

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            setLoading(true);

            try {
                // 1) Auth state from Gateway (/auth/me)
                const authRes = await api.get<AuthUser>("/auth/me");

                if (cancelled) {
                    return;
                }

                setAuthUser(authRes.data);
                setIsAuthenticated(true);

                // 2) Internal user from Gateway (/users/me)
                // Current contract may still return an envelope. We'll consume it safely.
                const userRes = await api.get<InternalUserEnvelope>("/users/me");

                if (cancelled) {
                    return;
                }

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

                // Do not overwrite user's activeRole unless missing or invalid
                const defaultRole = resolveDefaultRole(assignedRoles);
                if (defaultRole && (!activeRole || !assignedRoles.includes(activeRole))) {
                    setActiveRole(defaultRole);
                }
            } catch (e) {
                const err = e as ApiError;

                // Important: interceptor already handles 401 (toast + redirect).
                // Here we only reset local state in a clean way.
                if (!cancelled) {
                    setIsAuthenticated(false);
                    setAuthUser(null);
                    setInternalUser(null);
                    setActiveRole(null);

                    // No console logs, no backend messages displayed.
                    // We deliberately do not surface err.message here (AuthContext is not a UI screen).
                    void err;
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        bootstrap();

        return () => {
            cancelled = true;
        };
    }, [API_ROOT]);

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
        }),
        [loading, isAuthenticated, authUser, internalUser, roles, activeRole]
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

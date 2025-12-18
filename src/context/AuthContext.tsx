import {createContext, ReactNode, useContext, useEffect, useMemo, useState,} from "react";

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

    // Single source of truth for roles = internalUser.roles
    const roles = useMemo(() => {
        if (internalUser && Array.isArray(internalUser.roles)) {
            return internalUser.roles;
        } else {
            return [];
        }
    }, [internalUser]);

    const login = () => {
        window.location.href = `${API_ROOT}/auth/login`;
    };

    const logout = () => {
        window.location.href = `${API_ROOT}/auth/logout`;
    };

    const resolveDefaultRole = (currentRoles: string[]) => {
        // Priority: ADMIN > TUTOR > STUDENT
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
        async function bootstrap() {
            try {
                const authRes = await fetch(`${API_ROOT}/auth/me`, {
                    credentials: "include",
                });

                if (!authRes.ok) {
                    setIsAuthenticated(false);
                    setAuthUser(null);
                    setInternalUser(null);
                    setActiveRole(null);
                    return;
                }

                const auth: AuthUser = await authRes.json();
                setAuthUser(auth);
                setIsAuthenticated(true);

                const userRes = await fetch(`${API_ROOT}/users/me`, {
                    credentials: "include",
                });

                if (userRes.ok) {
                    const envelope: InternalUserEnvelope = await userRes.json();

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
                } else {
                    setInternalUser(null);
                    setActiveRole(null);
                }
            } catch (err) {
                console.error("Auth bootstrap failed:", err);
                setIsAuthenticated(false);
                setAuthUser(null);
                setInternalUser(null);
                setActiveRole(null);
            } finally {
                setLoading(false);
            }
        }

        bootstrap();
    }, [API_ROOT]);

    useEffect(() => {
        // Ensure activeRole remains consistent after internalUser changes (e.g., tutor promotion)
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
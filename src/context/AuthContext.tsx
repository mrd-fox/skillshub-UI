import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import type {KeycloakProfile} from "keycloak-js";
import Keycloak from "keycloak-js";
import keycloakSingleton from "@/lib/KeycloakSingleton.ts";

export interface AuthContextType {
    keycloak: Keycloak;
    isAuthenticated: boolean;
    userProfile: KeycloakProfile | null;
    roles: string[];
    activeRole: string | null;
    setActiveRole: (role: string | null) => void;
    ready: boolean;
    login: () => void;
    logout: () => void;
    register: () => void;
    refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfile, setUserProfile] = useState<KeycloakProfile | null>(null);
    const [ready, setReady] = useState(false);
    const [roles, setRoles] = useState<string[]>([]);
    const [activeRole, setActiveRole] = useState<string | null>(null);

    useEffect(() => {
        // 🧩 Avoid multiple Keycloak init calls
        // @ts-ignore
        if (keycloakSingleton.__initialized && keycloakSingleton.isAuthenticated) {
            console.debug("⚠️ Keycloak déjà initialisé — skip init");
            setReady(true);
            setIsAuthenticated(true);

            if (keycloakSingleton.tokenParsed) {
                const parsed = keycloakSingleton.tokenParsed as any;
                const realmRoles = parsed?.realm_access?.roles || [];
                setRoles(realmRoles);
                console.log("🎭 Roles extraits depuis le token:", realmRoles);
            }

            // if (keycloakSingleton.authenticated) {
            keycloakSingleton.loadUserProfile()
                .then(setUserProfile)
                .catch((err) => console.error("⚠️ Failed to load profile:", err));

            //todo refresh tocken more long
            const refresh = setInterval(async () => {
                if (!keycloakSingleton.authenticated) return;
                try {
                    const refreshed = await keycloakSingleton.updateToken(60);
                    if (refreshed) console.debug("🔁 Token refreshed successfully");
                } catch (err) {
                    console.error("⛔ Token refresh failed, redirecting to login");
                    keycloakSingleton.login();
                }
            }, 60000);

            return () => clearInterval(refresh);
        }

        keycloakSingleton.init({
            onLoad: "check-sso",
            pkceMethod: "S256",
            silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
        })
            .then((authenticated) => {
                console.log("🔐 Keycloak init terminé. Authenticated:", authenticated);
                keycloakSingleton.__initialized = true; // ✅ placé ici uniquement après succès
                setIsAuthenticated(authenticated);

                if (authenticated) {
                    keycloakSingleton.loadUserProfile()
                        .then(setUserProfile)
                        .catch(err => console.error("⚠️ Failed to load profile:", err));
                }
                const parsed = keycloakSingleton.tokenParsed as any;
                const realmRoles = parsed?.realm_access?.roles || [];
                console.log("roles => ", realmRoles);
                setRoles(realmRoles);

            })
            .catch(err => {
                console.error("❌ Keycloak init failed:", err)
                keycloakSingleton.__initialized = false;
            })
            .finally(() => {
                setReady(true)
            });

        // 🕐 Boucle de refresh
        const refresh = setInterval(async () => {
            if (!keycloakSingleton.authenticated) return;
            try {
                const refreshed = await keycloakSingleton.updateToken(60);
                if (refreshed) console.debug("🔁 Token refreshed successfully");
            } catch (err) {
                console.error("⛔ Token refresh failed, redirecting to login");
                keycloakSingleton.login();
            }
        }, 60000);

        // 🧹 Nettoyage au démontage
        return () => clearInterval(refresh);
    }, []);

    const login = () => keycloakSingleton.login();
    const logout = () => keycloakSingleton.logout();
    const register = () => keycloakSingleton.register();
    const refreshToken = async () => keycloakSingleton.updateToken(60);

    const value = useMemo(
        () => ({
            keycloak: keycloakSingleton,
            isAuthenticated,
            userProfile,
            roles,
            ready,
            activeRole,
            setActiveRole,
            login,
            logout,
            register,
            refreshToken,
        }),
        [isAuthenticated, userProfile, roles, ready, activeRole]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
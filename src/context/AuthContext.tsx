import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import type {KeycloakProfile} from "keycloak-js";
import Keycloak from "keycloak-js";
import keycloakSingleton from "@/lib/KeycloakSingleton.ts";

export interface AuthContextType {
    keycloak: Keycloak;
    isAuthenticated: boolean;
    userProfile: KeycloakProfile | null;
    roles: string[];
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

    useEffect(() => {
        // 🧩 Avoid multiple Keycloak init calls
        // @ts-ignore
        if (keycloakSingleton.__initialized) {
            console.debug("⚠️ Keycloak déjà initialisé — skip init");
            setReady(true);
            setIsAuthenticated(!!keycloakSingleton.authenticated);

            if (keycloakSingleton.tokenParsed) {
                const parsed = keycloakSingleton.tokenParsed as any;
                const realmRoles = parsed?.realm_access?.roles || [];
                setRoles(realmRoles);
                console.log("🎭 Roles extraits depuis le token:", realmRoles);
            }

            if (keycloakSingleton.authenticated) {
                keycloakSingleton.loadUserProfile()
                    .then(setUserProfile)
                    .catch((err) => console.error("⚠️ Failed to load profile:", err));
            }

            // ⛔ Important: Stop here!
            return;
        }

        // @ts-ignore
        keycloakSingleton.__initialized = true;

        keycloakSingleton
            .init({
                onLoad: "check-sso",
                pkceMethod: "S256",
                checkLoginIframe: false,
                silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
            })
            .then(async (authenticated) => {

                setIsAuthenticated(authenticated);
                console.log("🪙 Token complet déchiffré:", keycloakSingleton.tokenParsed);
                if (keycloakSingleton.tokenParsed) {
                    const parsed = keycloakSingleton.tokenParsed as any;
                    const realmRoles = parsed?.realm_access?.roles || [];
                    console.log(realmRoles)
                    setRoles(realmRoles);
                }

                if (authenticated) {
                    try {
                        const profile = await keycloakSingleton.loadUserProfile();
                        setUserProfile(profile);
                    } catch (err) {
                        console.error("⚠️ Failed to load Keycloak profile:", err);
                    }
                }

                // ✅ Only set ready TRUE here
                setReady(true);
            })
            .catch((err) => {
                console.error("❌ Keycloak init error:", err);
                setReady(true); // still mark ready to avoid blocking UI
            });

        // 🕐 Token refresh loop
        const refresh = setInterval(async () => {
            if (!keycloakSingleton.authenticated) return;
            try {
                const refreshed = await keycloakSingleton.updateToken(60);
                if (refreshed) console.debug("🔁 Token refreshed successfully");
            } catch (err) {
                console.error("⛔ Token refresh failed, redirecting to login");
            }
        }, 60000);

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
            login,
            logout,
            register,
            refreshToken,
        }),
        [isAuthenticated, userProfile, roles, ready]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
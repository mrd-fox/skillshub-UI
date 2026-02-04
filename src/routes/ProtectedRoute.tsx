import {ReactNode, useEffect} from "react";
import {Loader2} from "lucide-react";
import {Navigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.tsx";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles?: string[];
}

export default function ProtectedRoute({children, requiredRoles}: ProtectedRouteProps) {
    const {
        loading,
        isAuthenticated,
        internalUser,
        login,
        logout,
        authError,
        profileError,
        retryBootstrap,
        clearAuthError,
        clearProfileError,
    } = useAuth();

    // 1) Bootstrap in progress
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">Chargement de la session...</p>
            </div>
        );
    }

    // 2) Session check (auth/me) technical outage -> NO auto-login
    if (authError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
                <div className="flex flex-col gap-2">
                    <p className="text-base font-medium">Service indisponible</p>
                    <p className="text-sm text-muted-foreground">
                        Impossible de vérifier votre session pour le moment. Réessayez dans quelques instants.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm"
                        onClick={() => {
                            retryBootstrap();
                        }}
                    >
                        Réessayer
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                        onClick={() => {
                            login();
                        }}
                    >
                        Se connecter
                    </button>
                </div>

                <span className="sr-only">{authError.status}</span>
            </div>
        );
    }

    // 3) Not authenticated -> redirect to Gateway login (automatic)
    if (!isAuthenticated) {
        return <LoginRedirect login={login}/>;
    }

    // 4) Profile errors (users/me) after auth OK
    if (profileError) {
        // 401/403 here should NOT trigger login. It's an authorization/profile issue.
        if (profileError.status === 401 || profileError.status === 403) {
            return <Navigate to="/unauthorized" replace/>;
        }

        // Technical outage on profile -> no login
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
                <div className="flex flex-col gap-2">
                    <p className="text-base font-medium">Profil indisponible</p>
                    <p className="text-sm text-muted-foreground">
                        Votre compte est connecté, mais le profil utilisateur n’est pas accessible pour le moment.
                        Réessayez dans quelques instants.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm"
                        onClick={() => {
                            retryBootstrap();
                        }}
                    >
                        Réessayer
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                        onClick={() => {
                            // Optional: allow user to explicitly exit
                            logout();
                        }}
                    >
                        Se déconnecter
                    </button>
                </div>

                <span className="sr-only">{profileError.status}</span>
            </div>
        );
    }

    // 5) Authenticated but internal profile missing -> no private access
    if (!internalUser) {
        return <Navigate to="/unauthorized" replace/>;
    }

    const userRoles = internalUser.roles ?? [];
    if (userRoles.length === 0) {
        return <Navigate to="/unauthorized" replace/>;
    }

    // 6) Role guard
    if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.some((required) => userRoles.includes(required));
        if (!hasRole) {
            return <Navigate to="/unauthorized" replace/>;
        }
    }

    return <>{children}</>;
}

function LoginRedirect({login}: { login: () => void }) {
    useEffect(() => {
        login();
    }, [login]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            <p className="text-sm text-muted-foreground">Redirection vers la connexion...</p>
        </div>
    );
}

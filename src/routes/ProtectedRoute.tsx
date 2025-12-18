import {ReactNode, useEffect} from "react";
import {Loader2} from "lucide-react";
import {useAuth} from "@/context/AuthContext.tsx";
import {Navigate} from "react-router-dom";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles?: string[];
}

export default function ProtectedRoute({children, requiredRoles}: ProtectedRouteProps) {
    const {loading, isAuthenticated, internalUser, login} = useAuth();

    // Auth bootstrap in progress
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">Chargement de la session...</p>
            </div>
        );
    }

    // Not authenticated -> redirect to Gateway login
    if (!isAuthenticated) {
        return <LoginRedirect login={login}/>;
    }

    // Authenticated but internal profile missing -> no private access
    if (!internalUser) {
        return <Navigate to="/unauthorized" replace/>;
    }

    const userRoles = internalUser.roles ?? [];
    if (userRoles.length === 0) {
        return <Navigate to="/unauthorized" replace/>;
    }

    // Role guard
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
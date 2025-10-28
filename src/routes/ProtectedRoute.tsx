import {ReactNode} from "react";
import {Loader2} from "lucide-react";
import {useAuth} from "@/context/AuthContext.tsx";
import {Navigate} from "react-router-dom";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles?: string[]; // optional : ex. ["ADMIN"], ["TUTOR"]
}

export default function ProtectedRoute({children, requiredRoles}: ProtectedRouteProps) {
    const {isAuthenticated, roles, ready} = useAuth();

    if (!ready) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">Initialisation de la session...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        console.log("🚫 Utilisateur non authentifié — accès interdit (pas encore connecté)");

        return null;
    }

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.some((role) => roles.includes(role))
    ) {
        console.log("redirection")
        return <Navigate to="/unauthorized" replace/>;
    }

    return <>{children}</>;
}
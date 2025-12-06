import {ReactNode} from "react";
import {Loader2} from "lucide-react";
import {useAuth} from "@/context/AuthContext.tsx";
import {Navigate} from "react-router-dom";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles?: string[]; // ex: ["TUTOR"], ["STUDENT", "TUTOR"]
}

export default function ProtectedRoute({children, requiredRoles}: ProtectedRouteProps) {

    const {loading, isAuthenticated, internalUser} = useAuth();

    // 1️⃣ Authentication bootstrap loading
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                <p className="text-sm text-muted-foreground">Chargement de la session...</p>
            </div>
        );
    }

    // 2️⃣ Not authenticated → redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }

    // 3️⃣ Authenticated but NO internalUser data → treat as visitor
    if (!internalUser) {
        return <Navigate to="/login" replace/>;
    }

    // 4️⃣ User authenticated but has NO roles → visitor (no private access)
    const userRoles = internalUser.roles ?? [];
    if (userRoles.length === 0) {
        return <Navigate to="/login" replace/>;
    }

    // 5️⃣ Required role but user does not have it → unauthorized
    if (requiredRoles && requiredRoles.length > 0) {

        const hasRole = requiredRoles.some((required) => {
            return userRoles.includes(required);
        });

        if (!hasRole) {
            return <Navigate to="/unauthorized" replace/>;
        }
    }

    // 6️⃣ User is authenticated AND authorized
    return <>{children}</>;
}
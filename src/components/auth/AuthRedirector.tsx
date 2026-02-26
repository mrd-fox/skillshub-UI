import {useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.tsx";


function resolveTargetPath(roles: string[], activeRole: string | null): string | null {
    if (activeRole === "ADMIN") {
        return "/admin/dashboard";
    } else if (activeRole === "TUTOR") {
        return "/dashboard/tutor";
    } else if (activeRole === "STUDENT") {
        return "/dashboard/student";
    } else {
        if (roles.includes("ADMIN")) {
            return "/admin/dashboard";
        } else if (roles.includes("TUTOR")) {
            return "/dashboard/tutor";
        } else if (roles.includes("STUDENT")) {
            return "/dashboard/student";
        } else {
            return null;
        }
    }
}

export function AuthRedirector() {
    const {loading, isAuthenticated, internalUser, activeRole} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (loading) {
            return;
        }

        if (!isAuthenticated) {
            return;
        }

        // Never redirect while user is already inside protected areas
        if (location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/admin")) {
            return;
        }

        // Redirect only on entry pages
        const isRedirectEligible =
            location.pathname === "/" ||
            location.pathname === "/login" ||
            location.pathname === "/unauthorized";

        if (!isRedirectEligible) {
            return;
        }

        // Authenticated but profile missing -> no dashboard redirection possible
        if (!internalUser) {
            if (location.pathname !== "/unauthorized") {
                navigate("/unauthorized", {replace: true});
            }
            return;
        }

        const roles = internalUser.roles ?? [];
        const target = resolveTargetPath(roles, activeRole);

        if (!target) {
            if (location.pathname !== "/unauthorized") {
                navigate("/unauthorized", {replace: true});
            }
            return;
        }

        if (location.pathname !== target) {
            navigate(target, {replace: true});
        }
    }, [loading, isAuthenticated, internalUser, activeRole, location.pathname, navigate]);

    return null;
}
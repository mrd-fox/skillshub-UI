import {useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.tsx";


export function AuthRedirector() {

    const {
        loading,
        isAuthenticated,
        internalUser,
        activeRole,
        setActiveRole,
    } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // 1) Still loading
        if (loading) {
            return;
        }

        // 2) Not authenticated: stay on public pages
        if (!isAuthenticated) {
            return;
        }

        // 3) Authenticated but internal user not loaded yet
        if (!internalUser) {
            return;
        }

        const roles = internalUser.roles ?? [];

        // 4) No roles: nothing to do
        if (roles.length === 0) {
            return;
        }

        // 5) Resolve role with priority
        let resolved: string | null = null;

        if (roles.includes("ADMIN")) {
            resolved = "ADMIN";
        } else if (roles.includes("TUTOR")) {
            resolved = "TUTOR";
        } else if (roles.includes("STUDENT")) {
            resolved = "STUDENT";
        }

        if (resolved === null) {
            return;
        }

        // 6) Keep activeRole aligned with resolved role
        if (activeRole !== resolved) {
            setActiveRole(resolved);
        }

        // 7) Redirect if not already in the correct section
        const currentPath = location.pathname;

        if (resolved === "ADMIN") {
            if (!currentPath.startsWith("/admin")) {
                navigate("/admin/dashboard", {replace: true});
            }
            return;
        }

        if (resolved === "TUTOR") {
            if (!currentPath.startsWith("/dashboard/tutor")) {
                navigate("/dashboard/tutor", {replace: true});
            }
            return;
        }

        // STUDENT
        if (!currentPath.startsWith("/dashboard/student")) {
            navigate("/dashboard/student", {replace: true});
        }
    }, [
        loading,
        isAuthenticated,
        internalUser,
        activeRole,
        setActiveRole,
        navigate,
        location.pathname,
    ]);
    return null;
}
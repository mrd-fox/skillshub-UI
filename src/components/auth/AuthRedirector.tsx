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

        // 2) User is not authenticated → leave them on public pages
        if (!isAuthenticated) {
            return;
        }

        // 3) Authenticated but internal user not loaded yet
        if (!internalUser) {
            return;
        }

        // 4) Already has activeRole → do nothing
        if (activeRole) {
            return;
        }

        const roles = internalUser.roles ?? [];

        // 5) Authenticated but no roles → visitor mode
        if (roles.length === 0) {
            return;
        }

        // 6) Resolve role with priority
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

        // 7) Prevent redirect loops if user is ALREADY on the correct page
        const currentPath = location.pathname;

        if (resolved === "ADMIN") {
            if (!currentPath.startsWith("/admin")) {
                setActiveRole("ADMIN");
                navigate("/admin/dashboard", {replace: true});
            }
            return;
        }

        if (resolved === "TUTOR") {
            if (!currentPath.startsWith("/dashboard/tutor")) {
                setActiveRole("TUTOR");
                navigate("/dashboard/tutor", {replace: true});
            }
            return;
        }

        if (resolved === "STUDENT") {
            if (!currentPath.startsWith("/dashboard/student")) {
                setActiveRole("STUDENT");
                navigate("/dashboard/student", {replace: true});
            }
            return;
        }

    }, [
        loading,
        isAuthenticated,
        internalUser,
        activeRole,
        setActiveRole,
        navigate,
        location
    ]);

    return null;
}
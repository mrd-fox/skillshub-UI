import {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.tsx";

export function AuthRedirector() {
    const {ready, isAuthenticated, roles, activeRole, setActiveRole} = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!ready || !isAuthenticated) return;
        if (!roles || roles.length === 0) return;
        if (activeRole) return;

        if (roles.includes("ADMIN")) {
            navigate("/admin/dashboard", {replace: true});
            setActiveRole("ADMIN");
        } else if (roles.includes("TUTOR")) {
            navigate("/dashboard/tutor", {replace: true});
            setActiveRole("TUTOR");
        } else {
            navigate("/dashboard/student", {replace: true});
            setActiveRole("STUDENT");
        }
    }, [ready, isAuthenticated, roles, activeRole, navigate]);

    return null;
}

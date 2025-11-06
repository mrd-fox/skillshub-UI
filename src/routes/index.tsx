// src/routes/index.tsx
import {Navigate, Route, Routes, useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.tsx";
import ProtectedRoute from "@/routes/ProtectedRoute.tsx";

// Layouts for different user roles (to be implemented next)
// import {AdminLayout} from "@/layouts/tutor"; // optional future use
// Pages
import HomePage from "@/pages/HomePage.tsx";
import UnauthorizedPage from "@/pages/UnautorizedPage.tsx";
import {AppLayout} from "@/layout/AppLayout.tsx";
import {useEffect} from "react";
import TutorLayout from "@/layout/tutor/TutorLayout.tsx";
import StudentLayout from "@/layout/student/StudentLayout.tsx";


// Placeholder dashboards (temporary content until we create real ones)
const TutorDashboard = () => <div className="p-6">👨‍🏫 Tutor Dashboard</div>;
const StudentDashboard = () => <div className="p-6">🎓 Student Dashboard</div>;

// const AdminDashboard = () => <div className="p-6">🛠️ Admin Dashboard</div>;

export function AppRoutes() {
    const {ready, isAuthenticated, roles, activeRole} = useAuth();
    const navigate = useNavigate();

    // 🔁 Redirect authenticated users to their default dashboard
    useEffect(() => {
        if (!ready || !isAuthenticated) return;
        if (activeRole) return;
        if (isAuthenticated) {
            if (roles.includes("ADMIN")) {
                navigate("/admin/dashboard", {replace: true});
            } else if (roles.includes("TUTOR")) {
                navigate("/dashboard/tutor", {replace: true});
            } else if (roles.includes("STUDENT")) {
                navigate("/dashboard/student", {replace: true});
            }
        }
    }, [ready, isAuthenticated, roles, navigate]);

    return (
        <Routes>
            {/* Public area */}
            <Route element={<AppLayout/>}>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/unauthorized" element={<UnauthorizedPage/>}/>
            </Route>

            {/* Student area */}
            <Route
                path="/dashboard/student/*"
                element={
                    <ProtectedRoute requiredRoles={["STUDENT", "TUTOR"]}>
                        <StudentLayout>
                            <StudentDashboard/>
                        </StudentLayout>
                    </ProtectedRoute>
                }
            />

            {/* Tutor area */}
            <Route
                path="/dashboard/tutor/*"
                element={
                    <ProtectedRoute requiredRoles={["TUTOR"]}>
                        <TutorLayout>
                            <TutorDashboard/>
                        </TutorLayout>
                    </ProtectedRoute>
                }
            />

            {/*Admin area */}
            {/*<Route*/}
            {/*    path="/admin/*"*/}
            {/*    element={*/}
            {/*        <ProtectedRoute requiredRoles={["ADMIN"]}>*/}
            {/*            <AdminLayout>*/}
            {/*                <AdminDashboard/>*/}
            {/*            </AdminLayout>*/}
            {/*        </ProtectedRoute>*/}
            {/*    }*/}
            {/*/>*/}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
    );
}
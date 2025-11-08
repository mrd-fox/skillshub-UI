// src/routes/studentRoutes.tsx
import {Navigate, RouteObject} from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.tsx";
import StudentLayout from "@/layout/student/StudentLayout.tsx";

const StudentDashboard = () => <div className="p-6">🎓 Student Dashboard</div>;

export const studentRoutes: RouteObject = {
    path: "/dashboard/student",
    element: (
        <ProtectedRoute requiredRoles={["STUDENT", "TUTOR"]}>
            <StudentLayout/>
        </ProtectedRoute>
    ),
    children: [
        {index: true, element: <StudentDashboard/>},
        {path: "*", element: <Navigate to="/dashboard/student" replace/>},
    ],
};

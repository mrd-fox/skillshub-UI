/**
 * Student routes
 * Defines routing for student dashboard
 */

import {Navigate, RouteObject} from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.tsx";
import StudentLayout from "@/layout/student/StudentLayout.tsx";
import StudentDashboardPage from "@/pages/student/StudentDashboardPage.tsx";
import StudentMyCoursesPage from "@/pages/student/StudentMyCoursesPage.tsx";

export const studentRoutes: RouteObject = {
    path: "/dashboard/student",
    element: (
        <ProtectedRoute requiredRoles={["STUDENT", "TUTOR"]}>
            <StudentLayout/>
        </ProtectedRoute>
    ),
    children: [
        {index: true, element: <StudentDashboardPage/>},
        {path: "courses", element: <StudentMyCoursesPage/>},
        {path: "courses/:courseId", element: <Navigate to="/dashboard/student/courses" replace/>},
        {path: "*", element: <Navigate to="/dashboard/student" replace/>},
    ],
};

// src/routes/tutorRoutes.tsx
import {Navigate, RouteObject} from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.tsx";
import TutorLayout from "@/layout/tutor/TutorLayout.tsx";
import CourseBuilder from "@/components/courseBuilder/CourseBuilder.tsx";
import CourseBuilderPage from "@/pages/CourseBuilderPage.tsx";

const TutorDashboard = () => <div className="p-6">👨‍🏫 Tutor Dashboard</div>;

export const tutorRoutes: RouteObject = {
    path: "/dashboard/tutor",
    element: (
        <ProtectedRoute requiredRoles={["TUTOR"]}>
            <TutorLayout/>
        </ProtectedRoute>
    ),
    children: [
        {index: true, element: <TutorDashboard/>},
        {path: "create", element: <CourseBuilder/>},
        {path: "course-builder/:courseId", element: <CourseBuilderPage/>},
        {path: "*", element: <Navigate to="/dashboard/tutor" replace/>},
    ],
};

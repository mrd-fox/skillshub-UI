// src/routes/tutorRoutes.tsx
import {Navigate, RouteObject} from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.tsx";
import TutorLayout from "@/layout/tutor/TutorLayout.tsx";
import CourseBuilder from "@/components/courseBuilder/CourseBuilder.tsx";
import CourseBuilderLayout from "@/layout/CourseBuilderLayout.tsx";
import SectionsPage from "@/pages/tutor/course-builder/SectionsPage.tsx";
import ResourcesPage from "@/pages/tutor/course-builder/ResourcesPage.tsx";
import EditCoursePage from "@/pages/tutor/course-builder/EditCoursePage.tsx";
import SettingsPage from "@/pages/tutor/course-builder/SettingsPage.tsx";

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

        // ✅ Course builder complet avec layout et sous-pages
        {
            path: "course-builder/:courseId",
            element: <CourseBuilderLayout/>,
            children: [
                {path: "edit", element: <EditCoursePage/>},
                {path: "sections", element: <SectionsPage/>},
                {path: "resources", element: <ResourcesPage/>},
                {path: "settings", element: <SettingsPage/>},
                // fallback interne pour rediriger automatiquement vers /edit
                {index: true, element: <Navigate to="edit" replace/>},
            ],
        },
        {path: "*", element: <Navigate to="/dashboard/tutor" replace/>},
    ],
};

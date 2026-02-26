// src/routes/tutorRoutes.tsx
import {Navigate} from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.tsx";
import TutorLayout from "@/layout/tutor/TutorLayout.tsx";
import CourseBuilder from "@/components/courseBuilder/CourseBuilder.tsx";

import SectionsPage from "@/pages/tutor/course-builder/SectionsPage.tsx";
import ResourcesPage from "@/pages/tutor/course-builder/ResourcesPage.tsx";
import EditCoursePage from "@/pages/tutor/course-builder/EditCoursePage.tsx";
import SettingsPage from "@/pages/tutor/course-builder/SettingsPage.tsx";
import TutorMyCoursesPage from "@/pages/tutor/TutorMyCoursesPage.tsx";
import {JSX} from "react";
import {CourseBuilderLayout} from "@/layout/tutor";

const TutorDashboard = () => <div className="p-6">👨‍🏫 Tutor Dashboard</div>;

export let tutorRoutes: {
    path: string;
    element: JSX.Element;
    children: (
        { index: boolean; element: JSX.Element } |
        { path: string; element: JSX.Element } |
        {
            path: string;
            element: JSX.Element;
            children: (
                { path: string; element: JSX.Element } |
                { index: boolean; element: JSX.Element }
                )[]
        }
        )[]
};
// eslint-disable-next-line prefer-const
tutorRoutes = {
    path: "/dashboard/tutor",
    element: (
        <ProtectedRoute requiredRoles={["TUTOR"]}>
            <TutorLayout/>
        </ProtectedRoute>
    ),
    children: [
        {index: true, element: <TutorDashboard/>},
        // ✅ My Courses (list)
        {path: "courses", element: <TutorMyCoursesPage/>},
        // ✅ Create course
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

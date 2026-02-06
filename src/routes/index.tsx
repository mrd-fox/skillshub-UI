// src/routes/index.tsx
import {useRoutes} from "react-router-dom";

// Layouts for different user roles (to be implemented next)
// import {AdminLayout} from "@/layouts/tutor"; // optional future use
// Pages
import HomePage from "@/pages/HomePage.tsx";
import UnauthorizedPage from "@/pages/UnautorizedPage.tsx";
import {AppLayout} from "@/layout/AppLayout.tsx";
import {tutorRoutes} from "@/routes/tutorRoutes.tsx";
import {studentRoutes} from "@/routes/studentRoutes.tsx";

export function AppRoutes() {
    const routes = [
        {
            element: <AppLayout/>,
            children: [
                {path: "/", element: <HomePage/>},
                {path: "/unauthorized", element: <UnauthorizedPage/>},
            ],
        },

        //TODO Admin routes

        tutorRoutes,
        studentRoutes,
        {path: "*", element: <HomePage/>},
    ];

    return useRoutes(routes);
}
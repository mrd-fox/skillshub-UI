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
import {useEffect} from "react";

function LoginRedirect() {
    useEffect(() => {
        // window.location.href = "/api/auth/login";
        window.location.assign("/api/auth/login");
    }, []);

    return null;
}

export function AppRoutes() {


    const routes = [
        {
            element: <AppLayout/>,
            children: [
                {path: "/", element: <HomePage/>},
                // 🔐 Route de login propre
                {path: "/login", element: <LoginRedirect/>},
                {path: "/unauthorized", element: <UnauthorizedPage/>},
            ],
        },

        // 🔐 Admin routes (quand tu seras prêt)
        // adminRoutes,

        // 🎓 Routes Tuteur
        tutorRoutes,
        // 🎓 Routes Étudiant
        studentRoutes,
        // 🌍 Fallback global
        {path: "*", element: <HomePage/>},
    ];

    return useRoutes(routes);
}
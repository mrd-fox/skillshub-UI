// src/layouts/tutor/TutorLayout.tsx
import {Outlet} from "react-router-dom";

import TutorSidebar from "./TutorSidebar";
import TutorHeader from "@/layout/tutor/TutorHeader.tsx";

/**
 * TutorLayout defines the main dashboard structure for tutors.
 * It includes a sidebar, a header, and an outlet for nested routes.
 */



export default function TutorLayout() {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <TutorSidebar/>
            {/* Main content area */}
            <div className="flex flex-col flex-1">
                <TutorHeader/>
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet/>
                </main>
            </div>
        </div>
    );
}

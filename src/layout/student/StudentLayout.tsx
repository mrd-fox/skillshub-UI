// src/layouts/student/StudentLayout.tsx
import {ReactNode} from "react";
import {Outlet} from "react-router-dom";
import StudentSidebar from "./StudentSidebar";
import StudentHeader from "./StudentHeader";

/**
 * StudentLayout
 * Defines the main structure of the student dashboard.
 */
interface StudentLayoutProps {
    children?: ReactNode;
}

export default function StudentLayout({children}: StudentLayoutProps) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <StudentSidebar/>

            <div className="flex flex-col flex-1">
                <StudentHeader/>
                <main className="flex-1 overflow-y-auto p-6">
                    {children || <Outlet/>}
                </main>
            </div>
        </div>
    );
}

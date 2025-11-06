// src/layouts/tutor/TutorSidebar.tsx
import {NavLink, useLocation} from "react-router-dom";
import {BookOpen, LayoutDashboard, LogOut, PlusCircle, Settings, Users,} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import {Button} from "@/components/ui/button";
import {motion} from "framer-motion";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar.tsx";

/**
 * Sidebar navigation for Tutor dashboard area.
 * Uses shadcn/ui components and lucide-react icons.
 */
export default function TutorSidebar() {
    const {userProfile, logout} = useAuth();
    const location = useLocation();

    // Extract initials from user profile
    const initials =
        (userProfile?.firstName?.[0] || "") + (userProfile?.lastName?.[0] || "");

    // Sidebar navigation items
    const navItems = [
        {to: "/dashboard/tutor", label: "Dashboard", icon: LayoutDashboard},
        {to: "/dashboard/tutor/courses", label: "My Courses", icon: BookOpen},
        {to: "/dashboard/tutor/create", label: "Create Course", icon: PlusCircle},
        {to: "/dashboard/tutor/students", label: "My Students", icon: Users},
        {to: "/dashboard/tutor/settings", label: "Settings", icon: Settings},
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm relative">
            {/* 🧑 Tutor Info */}
            <div className="flex items-center gap-3 px-6 py-5 border-b bg-gray-50">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={(userProfile?.attributes as any)?.avatarUrl?.[0]}/>
                    <AvatarFallback>{initials || "TU"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-800">
            {userProfile?.firstName || "Tutor"}
          </span>
                    <span className="text-xs text-gray-500">Instructor</span>
                </div>
            </div>

            {/* 🧭 Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1 relative">
                {navItems.map(({to, label, icon: Icon}) => {
                    const isActive = location.pathname === to;

                    return (
                        <NavLink
                            key={to}
                            to={to}
                            end
                            className="relative block rounded-xl"
                        >
                            {/* Background animation */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute inset-0 bg-blue-50 rounded-xl"
                                    transition={{type: "spring", stiffness: 300, damping: 25}}
                                />
                            )}

                            <div
                                className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
                                    isActive
                                        ? "text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                }`}
                            >
                                <Icon className="w-4 h-4"/>
                                <span className="truncate">{label}</span>
                            </div>
                        </NavLink>
                    );
                })}
            </nav>

            {/* 🚪 Logout Button */}
            <div className="p-4 border-t mt-auto">
                <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    onClick={() => logout()}
                >
                    <LogOut className="w-4 h-4"/>
                    Logout
                </Button>
            </div>
        </aside>
    );
}
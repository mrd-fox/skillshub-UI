// src/layouts/student/StudentSidebar.tsx
import {NavLink, useLocation} from "react-router-dom";
import {BookOpen, Heart, LayoutDashboard, LogOut, Settings, User,} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {motion} from "framer-motion";
import {useAuth} from "@/context/AuthContext";

/**
 * StudentSidebar
 * Animated sidebar with avatar, menu, and logout.
 */
export default function StudentSidebar() {

    const {
        internalUser,
        logout
    } = useAuth();

    const location = useLocation();

    const initials =
        internalUser?.email
            ? internalUser.email.substring(0, 2).toUpperCase()
            : "ST";

    const navItems = [
        {to: "/dashboard/student", label: "Dashboard", icon: LayoutDashboard},
        {to: "/dashboard/student/courses", label: "My Courses", icon: BookOpen},
        {to: "/dashboard/student/wishlist", label: "Wishlist", icon: Heart},
        {to: "/dashboard/student/profile", label: "Profile", icon: User},
        {to: "/dashboard/student/settings", label: "Settings", icon: Settings},
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm relative">

            {/* 👤 Student info */}
            <div className="flex items-center gap-3 px-6 py-5 border-b bg-gray-50">
                <Avatar className="w-10 h-10">
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800">
                        {internalUser?.email ?? "Student"}
                    </span>
                    <span className="text-xs text-gray-500">
                        Learner
                    </span>
                </div>
            </div>

            {/* 🧭 Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 relative">
                {navItems.map(({to, label, icon: Icon}) => {
                    const isActive = location.pathname === to;

                    return (
                        <NavLink key={to} to={to} end className="relative block rounded-xl">
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicatorStudent"
                                    className="absolute inset-0 bg-green-50 rounded-xl"
                                    transition={{type: "spring", stiffness: 300, damping: 25}}
                                />
                            )}
                            <div
                                className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm font-medium ${
                                    isActive
                                        ? "text-green-700"
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

            {/* 🚪 Logout */}
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
// src/layouts/tutor/TutorHeader.tsx
import {useAuth} from "@/context/AuthContext";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";
import {GraduationCap, LogOut, User} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";

/**
 * TutorHeader component
 * Displays page title, role switch button (Learn on Skillhub),
 * and compact user dropdown.
 */
export default function TutorHeader() {
    const {
        internalUser,
        roles,
        logout,
        setActiveRole
    } = useAuth();

    const navigate = useNavigate();

    const hasStudentRole = roles.includes("STUDENT");

    const initials =
        internalUser?.email
            ? internalUser.email.substring(0, 2).toUpperCase()
            : "TU";

    const handleSwitchToStudent = () => {
        setActiveRole("STUDENT");
        navigate("/dashboard/student");
    };

    return (
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
            <h1 className="text-lg font-semibold text-gray-800">
                Tutor Dashboard
            </h1>

            <div className="flex items-center gap-3">

                {hasStudentRole && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={handleSwitchToStudent}
                    >
                        <GraduationCap className="w-4 h-4"/>
                        Learn on Skillhub
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem disabled className="text-gray-500 text-sm">
                            {internalUser?.email}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => navigate("/dashboard/tutor/settings")}
                            className="flex items-center gap-2"
                        >
                            <User className="w-4 h-4"/>
                            Profile
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={logout}
                            className="flex items-center gap-2 text-red-600"
                        >
                            <LogOut className="w-4 h-4"/>
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
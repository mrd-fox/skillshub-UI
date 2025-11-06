// src/layouts/student/StudentHeader.tsx
import {useAuth} from "@/context/AuthContext";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";
import {LogOut, School, User} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

/**
 * StudentHeader
 * Displays "Teach on Skillhub" button if user has TUTOR role
 */
export default function StudentHeader() {
    const {userProfile, roles, logout, setActiveRole} = useAuth();
    const navigate = useNavigate();

    const hasTutorRole = roles.includes("TUTOR");
    const initials =
        (userProfile?.firstName?.[0] || "") + (userProfile?.lastName?.[0] || "");

    const handleSwitchToTutor = () => {
        if (roles.includes("TUTOR")) {
            setActiveRole("TUTOR");
            navigate("/dashboard/tutor");
            return;
        }
        //show modal 
    };

    return (
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
            <h1 className="text-lg font-semibold text-gray-800">Student Dashboard</h1>

            <div className="flex items-center gap-3">
                {hasTutorRole && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={handleSwitchToTutor}
                    >
                        <School className="w-4 h-4"/>
                        Teach on Skillhub
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={(userProfile?.attributes as any)?.avatarUrl?.[0]}/>
                                <AvatarFallback>{initials || "ST"}</AvatarFallback>
                            </Avatar>
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem disabled className="text-gray-500 text-sm">
                            {userProfile?.firstName} {userProfile?.lastName}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate("/dashboard/student/profile")}
                            className="flex items-center gap-2"
                        >
                            <User className="w-4 h-4"/>
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={logout}
                            className="flex items-center gap-2 text-red-600 focus:text-red-700"
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

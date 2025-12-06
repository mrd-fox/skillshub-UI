// src/layouts/student/StudentHeader.tsx
import {useAuth} from "@/context/AuthContext";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";
import {LogOut, School, User} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {useTutorPromotion} from "@/hooks/useTutorPromotion";
import {useState} from "react";
import {TutorRequestDialog} from "@/components/tutor/TutorRequestDialog";

/**
 * 🎓 StudentHeader
 * Displays "Teach on Skillhub" button for all authenticated students.
 * If the user already has TUTOR role, clicking it switches view.
 * Otherwise, it opens a confirmation dialog to create tutor profile.
 */
export default function StudentHeader() {
    const {
        internalUser,
        logout,
        setActiveRole
    } = useAuth();

    const navigate = useNavigate();
    const {promoteToTutor} = useTutorPromotion();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<"success" | "error" | null>(null);

    const roles = internalUser?.roles ?? [];
    const hasTutorRole = roles.includes("TUTOR");

    const initials =
        internalUser?.email
            ? internalUser.email.substring(0, 2).toUpperCase()
            : "ST";

    const handleSwitchToTutor = () => {
        if (hasTutorRole) {
            setActiveRole("TUTOR");
            navigate("/dashboard/tutor");
        } else {
            setDialogOpen(true);
        }
    };

    const handleConfirmPromotion = async () => {
        setLoading(true);
        setResult(null);

        const success = await promoteToTutor();
        setLoading(false);

        if (success) {
            setResult("success");

            // Update active role
            setActiveRole("TUTOR");

            setTimeout(() => {
                setDialogOpen(false);
                navigate("/dashboard/tutor");
            }, 1200);
        } else {
            setResult("error");
        }
    };

    return (
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
            <h1 className="text-lg font-semibold text-gray-800">Student Dashboard</h1>

            <div className="flex items-center gap-3">

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchToTutor}
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    <School className="w-4 h-4"/>
                    {loading ? "Processing..." : "Teach on Skillhub"}
                </Button>

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
                            onClick={() => navigate("/dashboard/student/profile")}
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

            <TutorRequestDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={handleConfirmPromotion}
                loading={loading}
                result={result}
            />
        </header>
    );
}
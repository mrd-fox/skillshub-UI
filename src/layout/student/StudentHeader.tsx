// src/layouts/student/StudentHeader.tsx
import {useAuth} from "@/context/AuthContext";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";
import {LogOut, School, User} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
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
    const {userProfile, roles, logout, setActiveRole} = useAuth();
    const navigate = useNavigate();
    const {promoteToTutor} = useTutorPromotion();

    // 🧩 Local UI state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<"success" | "error" | null>(null);

    const hasTutorRole = roles.includes("TUTOR");
    const initials =
        (userProfile?.firstName?.[0] || "") + (userProfile?.lastName?.[0] || "");

    /**
     * Handles click on "Teach on Skillhub"
     * If user has TUTOR → switch directly
     * Otherwise → open modal
     */
    const handleSwitchToTutor = () => {
        if (hasTutorRole) {
            setActiveRole("TUTOR");
            navigate("/dashboard/tutor");
        } else {
            setDialogOpen(true);
        }
    };

    /**
     * Handles user confirmation inside TutorRequestDialog.
     * Keeps dialog open while processing and displays result.
     */
    const handleConfirmPromotion = async () => {
        setLoading(true);
        setResult(null);

        const success = await promoteToTutor();
        setLoading(false);

        if (success) {
            setResult("success");

            // ✅ Small delay before redirection so user sees confirmation
            setTimeout(() => {
                setDialogOpen(false);
                navigate("/dashboard/tutor");
            }, 1500);
        } else {
            setResult("error");
        }
    };

    return (
        <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
            <h1 className="text-lg font-semibold text-gray-800">Student Dashboard</h1>

            <div className="flex items-center gap-3">
                {/* 🔹 Teach button always visible (even if not yet TUTOR) */}
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={handleSwitchToTutor}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="flex items-center gap-2 text-blue-600">
              <School className="w-4 h-4 animate-pulse"/> Processing...
            </span>
                    ) : (
                        <>
                            <School className="w-4 h-4"/>
                            Teach on Skillhub
                        </>
                    )}
                </Button>

                {/* 🔸 Profile dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition">
                            <Avatar className="w-8 h-8">
                                <AvatarImage
                                    src={(userProfile?.attributes as any)?.avatarUrl?.[0]}
                                />
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

            {/* 🧩 Tutor creation modal */}
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
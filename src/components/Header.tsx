import {useTranslation} from "react-i18next";
import Logo from "@/assets/logo.tsx";
import {FC, useState} from "react";
import {Input} from "./ui/input.tsx";
import {Heart, LogOut, ShoppingCart, User, UserPlus} from "lucide-react";
import {useAuth} from "@/context/AuthContext.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useLocation, useNavigate} from "react-router-dom";
import {TutorRequestDialog} from "@/components/tutor/TutorRequestDialog.tsx";

interface HeaderProps {
    logoSize?: number;
}

const Header: FC<HeaderProps> = ({logoSize = 150}) => {
    const {t} = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const {
        isAuthenticated,
        authUser,
        internalUser,
        roles,
        login,
        logout,
        setActiveRole
    } = useAuth();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<"success" | "error" | null>(null);

    const hideNavbar =
        location.pathname.startsWith("/dashboard") ||
        location.pathname.startsWith("/admin");

    if (hideNavbar) {
        return null;
    }

    const handleTeachClick = () => {
        if (!isAuthenticated) {
            login();
            return;
        }

        if (!internalUser) {
            return;
        }

        const userRoles = internalUser.roles ?? [];

        if (userRoles.includes("TUTOR")) {
            setActiveRole("TUTOR");
            navigate("/dashboard/tutor");
            return;
        }

        if (userRoles.includes("STUDENT")) {
            setDialogOpen(true);
            return;
        }

        return;
    };

    return (
        <header className="w-full bg-white shadow-sm border-b sticky top-0 z-50 px-4 md:px-8 py-3">
            <div className="max-w-screen-2xl mx-auto flex justify-between items-center gap-4">

                {/* Logo */}
                <div className="flex items-center gap-3">
                    <Logo size={logoSize}/>
                </div>

                {/* Search bar */}
                <div className="flex-1 max-w-xl mx-4">
                    <Input
                        type="search"
                        placeholder={t("Search...") || "Rechercher..."}
                        className="w-full"
                    />
                </div>

                {/* Right section */}
                <div className="flex items-center gap-5 relative">

                    {/* Teach button */}
                    <button
                        onClick={handleTeachClick}
                        className="text-sm font-medium text-gray-700 hover:underline"
                    >
                        {t("teach_on_skillhub") || "Teach on Skillhub"}
                    </button>

                    {/* AUTH SECTION */}
                    {isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                                    <User className="w-5 h-5"/>
                                    <span className="hidden sm:inline text-sm font-medium">
                                        {internalUser?.email ??
                                            authUser?.email ??
                                            (t("my_account") || "Mon compte")}
                                    </span>
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem disabled>
                                    <span className="text-gray-700 text-sm">
                                        {internalUser?.email}
                                    </span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={() => logout()}
                                    className="flex items-center gap-2 text-red-600"
                                >
                                    <LogOut className="w-4 h-4"/>
                                    <span>{t("logout") || "Se déconnecter"}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => login()}
                                className="text-sm"
                            >
                                {t("login") || "Se connecter"}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => login()}
                                className="text-sm flex items-center gap-1"
                            >
                                <UserPlus className="w-4 h-4"/>
                                {t("create_account") || "Créer un compte"}
                            </Button>
                        </div>
                    )}

                    <Heart className="w-5 h-5 cursor-pointer text-gray-700 hover:text-red-500 transition"/>
                    <ShoppingCart className="w-5 h-5 cursor-pointer text-gray-700"/>
                </div>
            </div>

            {/* Tutor request modal */}
            <TutorRequestDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={async () => {
                    setLoading(true);
                    setResult(null);

                    const success = false; // plug your service here
                    setLoading(false);

                    if (success) {
                        setResult("success");
                        setActiveRole("TUTOR");
                        navigate("/dashboard/tutor");
                    } else {
                        setResult("error");
                    }
                }}
                loading={loading}
                result={result}
            />
        </header>
    );
};

export default Header;
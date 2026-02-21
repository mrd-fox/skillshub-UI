import {useTranslation} from "react-i18next";
import Logo from "@/assets/logo.tsx";
import {FC, useState} from "react";
import {Input} from "./ui/input.tsx";
import {Heart, LogOut, ShoppingCart, User} from "lucide-react";
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
import {userService} from "@/api/services";
import {InternalUser} from "@/api/types/user";
import {toast} from "sonner";

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
        login,
        logout,
        setActiveRole,
        setInternalUser,
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

    const fetchInternalUser = async (): Promise<InternalUser | null> => {
        try {
            const user = await userService.getMyProfile();
            setInternalUser(user);
            return user;
        } catch {
            return null;
        }
    };

    const handleTeachClick = async () => {
        if (!isAuthenticated) {
            login();
            return;
        }

        let currentUser = internalUser;

        if (!currentUser) {
            try {
                currentUser = await fetchInternalUser();
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : t("header.errors.profile_load_failed");
                toast.error(message);
                return;
            }
        }

        if (!currentUser) {
            toast.error(t("header.errors.profile_unavailable"));
            return;
        }

        const userRoles = currentUser.roles ?? [];

        if (userRoles.includes("TUTOR")) {
            setActiveRole("TUTOR");
            navigate("/dashboard/tutor");
            return;
        } else if (userRoles.includes("STUDENT")) {
            setDialogOpen(true);
            return;
        } else {
            toast.error(t("header.errors.invalid_roles"));
            return;
        }
    };

    const promoteToTutor = async () => {
        if (loading) {
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const promotedUser = await userService.promoteToTutor();
            setInternalUser(promotedUser);

            setResult("success");
            setDialogOpen(false);

            setActiveRole("TUTOR");
            navigate("/dashboard/tutor");
        } catch (error: unknown) {
            setResult("error");

            const e = error as { status?: number; message?: string };
            const status = e?.status;
            if (status === 401) {
                toast.error(t("api.errors.session_expired"));
                login();
                return;
            }

            toast.error(e?.message || t("header.errors.promotion_failed"));
            return;
        } finally {
            setLoading(false);
        }
    };

    return (
        <header className="w-full bg-white shadow-sm border-b sticky top-0 z-50 px-4 md:px-8 py-3">
            <div className="max-w-screen-2xl mx-auto flex justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <Logo size={logoSize}/>
                </div>

                <div className="flex-1 max-w-xl mx-4">
                    <Input
                        type="search"
                        placeholder={t("header.search")}
                        className="w-full"
                    />
                </div>

                <div className="flex items-center gap-5 relative">
                    <button
                        onClick={() => {
                            void handleTeachClick();
                        }}
                        className="text-sm font-medium text-gray-700 hover:underline"
                    >
                        {t("header.teach")}
                    </button>

                    {isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                                    <User className="w-5 h-5"/>
                                    <span className="hidden sm:inline text-sm font-medium">
                    {internalUser?.email ??
                        authUser?.email ??
                        t("header.account")}
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
                                    onClick={() => {
                                        logout();
                                    }}
                                    className="flex items-center gap-2 text-red-600"
                                >
                                    <LogOut className="w-4 h-4"/>
                                    <span>{t("auth.logout")}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                login();
                            }}
                            className="text-sm"
                        >
                            {t("auth.login")}
                        </Button>
                    )}

                    <Heart className="w-5 h-5 cursor-pointer text-gray-700 hover:text-red-500 transition"/>
                    <ShoppingCart className="w-5 h-5 cursor-pointer text-gray-700"/>
                </div>
            </div>

            <TutorRequestDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={() => {
                    void promoteToTutor();
                }}
                loading={loading}
                result={result}
            />
        </header>
    );
};

export default Header;
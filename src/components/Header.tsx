import {useTranslation} from "react-i18next";
import Logo from "@/assets/logo.tsx";
import {FC} from "react";
import {Input} from "./ui/input.tsx";
import {Heart, LogOut, ShoppingCart, User, UserCircle, UserPlus} from "lucide-react";
import {useAuth} from "@/context/AuthContext.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";

interface HeaderProps {
    logoSize?: number;
}

const Header: FC<HeaderProps> = ({logoSize = 150}) => {
    const {t} = useTranslation();
    const {isAuthenticated, userProfile, login, logout, register} = useAuth();


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
                    <a href="#" className="text-sm font-medium text-gray-700 hover:underline">
                        {t("teach_on_skillhub") || "Enseigner sur Skillhub"}
                    </a>


                    {/* --- Auth Section --- */}
                    {isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                                    <User className="w-5 h-5"/>
                                    <span className="hidden sm:inline text-sm font-medium">
                                        {userProfile?.firstName && userProfile.lastName
                                            ? userProfile?.firstName + " " + userProfile.lastName
                                            : (t("my_account") || "Mon profile")}
                                    </span>
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                    <a
                                        href="/profile"
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <UserCircle className="w-4 h-4 text-gray-600"/>
                                        <span>{t("my_profile") || "Mon profil"}</span>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => logout()}
                                    className="flex items-center gap-2 text-destructive"
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
                                onClick={() => register()}
                                className="text-sm flex items-center gap-1"
                            >
                                <UserPlus className="w-4 h-4"/>
                                {t("create_account") || "Créer un profil"}
                            </Button>
                        </div>
                    )}

                    {/* Icons */}
                    <Heart
                        className="w-5 h-5 cursor-pointer text-gray-700 transition-all duration-500 fill-none hover:fill-current hover:text-red-500"/>
                    <ShoppingCart className="w-5 h-5 cursor-pointer text-gray-700"/>
                </div>
            </div>
        </header>
    );
};

export default Header;
import {useTranslation} from "react-i18next";
import Logo from "@/assets/logo.tsx";
import {FC} from "react";
import { Input } from "../ui/input";
import {Heart, ShoppingCart, User} from "lucide-react";

interface HeaderProps {
    logoSize?: number;
}

const Header: FC<HeaderProps> = ({ logoSize = 150 }) => {
    const { t } = useTranslation();

    return (
        <header className="w-full bg-white shadow-sm border-b sticky top-0 z-50 px-4 md:px-8 py-3">
            <div className="max-w-screen-2xl mx-auto flex justify-between items-center gap-4">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <Logo size={logoSize} />
                </div>

                {/* Search bar */}
                <div className="flex-1 max-w-xl mx-4">
                    <Input
                        type="search"
                        placeholder={t("search") || "Rechercher..."}
                        className="w-full"
                    />
                </div>

                {/* Right links/icons */}
                <div className="flex items-center gap-5 relative">
                    <a href="#" className="text-sm font-medium text-gray-700 hover:underline">
                        Enseigner sur Skillhub
                    </a>

                    {/* Dropdown on hover */}
                    <div className="relative group">
                        <button className="text-sm font-medium text-gray-700 hover:underline">
                            Mon apprentissage
                        </button>

                        {/* Dropdown menu */}
                        <div className="absolute right-0 mt-2 hidden group-hover:block bg-white shadow-lg rounded-md p-4 w-80 z-50">
                            {[1, 2].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 mb-4 last:mb-0">
                                    <div className="w-12 h-12 bg-gray-100 rounded" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">Titre de la Formation</p>
                                        <div className="w-full bg-gray-200 rounded h-2 mt-1">
                                            <div className="bg-blue-500 h-2 rounded" style={{ width: `${(i + 1) * 40}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="w-full bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700">
                                Aller à mon apprentissage
                            </button>
                        </div>
                    </div>

                    <Heart className="w-5 h-5 cursor-pointer text-gray-700 transition-all duration-500 fill-none hover:fill-current hover:text-red-500 heart-icon" />
                    <ShoppingCart className="w-5 h-5 cursor-pointer text-gray-700" />
                    <User className="w-5 h-5 cursor-pointer text-gray-700" />
                </div>
            </div>
        </header>
    );
};

export default Header;
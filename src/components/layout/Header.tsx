import {ModeToggle} from "@/components/mode-toggle.tsx";
import {useTranslation} from "react-i18next";
import {LanguageSwitcher} from "@/components/change-language.tsx";
import Logo from "@/assets/logo.tsx";
import {FC} from "react";

interface HeaderProps {
    logoSize?: number;
}
const Header: FC<HeaderProps> = ({ logoSize = 150 }) => {
    const {t} = useTranslation();
    return (
        <header className="w-full bg-white shadow-sm border-b px-4 md:px-8 py-3 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <Logo size={logoSize} />
                <span className="text-xl font-bold text-gray-800">MaPlateforme</span>
            </div>
            <div className="text-xl font-bold">{t("header")}</div>
            <ModeToggle />
            <LanguageSwitcher/>
        </header>
    );
}

export default Header;
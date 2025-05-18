import {ModeToggle} from "@/components/mode-toggle.tsx";
import {useTranslation} from "react-i18next";
import {LanguageSwitcher} from "@/components/change-language.tsx";


export function Header() {
    const {t} = useTranslation();
    return (
        <header className="w-full bg-white shadow-sm border-b px-4 md:px-8 py-3 flex justify-between items-center sticky top-0 z-50">
            <div className="text-xl font-bold">MonLogo</div>
            <div className="text-xl font-bold">{t("header")}</div>
            <ModeToggle />
            <LanguageSwitcher/>
        </header>
    );
}
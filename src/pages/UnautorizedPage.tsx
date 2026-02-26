import {motion} from "framer-motion";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {AlertCircle} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {useTranslation} from "react-i18next";

export default function UnauthorizedPage() {
    const {t} = useTranslation();

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <motion.div
                initial={{opacity: 0, scale: 0.95}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.3, ease: "easeOut"}}
            >
                <Card className="max-w-md w-full shadow-lg border border-destructive/30">
                    <CardHeader className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-10 h-10 text-destructive"/>
                        <CardTitle className="text-destructive text-2xl">
                            {t("api.errors.access_denied")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            {t("errors.unauthorized_page_message")}
                        </p>
                        <Button variant="outline" onClick={() => (globalThis.location.assign("/"))}>
                            {/*<Button variant="outline" onClick={() => (window.location.href ="/")}>*/}
                            {t("navigation.back_home")}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
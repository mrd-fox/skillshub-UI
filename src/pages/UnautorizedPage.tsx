import {motion} from "framer-motion";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {AlertCircle} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";

export default function UnauthorizedPage() {

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
                            Accès refusé
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            Vous n’avez pas les permissions nécessaires pour consulter cette page.
                        </p>
                        {/*<Button variant="outline" onClick={() => (window.location.href = "/")}>*/}
                        <Button variant="outline" onClick={() => (window.location.assign("/"))}>
                            Retour à l’accueil
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
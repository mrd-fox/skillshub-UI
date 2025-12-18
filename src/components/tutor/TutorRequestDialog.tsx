// src/components/tutor/TutorRequestDialog.tsx
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {useEffect} from "react";

/**
 * Modal dialog to confirm tutor profile creation.
 */
interface TutorRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading: boolean;
    result: "success" | "error" | null;
}

export function TutorRequestDialog({
                                       open,
                                       onOpenChange,
                                       onConfirm,
                                       loading,
                                       result,
                                   }: TutorRequestDialogProps) {
    useEffect(() => {
        // Close dialog automatically after success
        if (open && result === "success") {
            onOpenChange(false);
        }
    }, [open, result, onOpenChange]);

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Créer un profil professeur ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        En confirmant, votre compte sera mis à jour avec le rôle <strong>TUTOR</strong>.
                        Vous aurez alors accès à l’espace enseignant pour créer et gérer vos cours.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {result === "error" ? (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        Une erreur est survenue pendant la promotion. Réessayez.
                    </div>
                ) : null}

                {result === "success" ? (
                    <div
                        className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                        Profil professeur activé. Redirection en cours...
                    </div>
                ) : null}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Annuler
                    </AlertDialogCancel>

                    <AlertDialogAction
                        disabled={loading || result === "success"}
                        onClick={onConfirm}
                    >
                        {loading ? "Traitement..." : result === "error" ? "Réessayer" : "Oui, créer"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
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

/**
 * Modal dialog to confirm tutor profile creation.
 */
interface TutorRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function TutorRequestDialog({open, onOpenChange, onConfirm}: TutorRequestDialogProps) {
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
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>Oui, créer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

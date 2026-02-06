import {userService} from "@/api/services";
import {useAuth} from "@/context/AuthContext";
import {toast} from "sonner";

/**
 * Hook that promotes the current user to TUTOR role through the Gateway.
 */
export function useTutorPromotion() {
    const {setActiveRole, setInternalUser} = useAuth();

    const promoteToTutor = async () => {
        try {
            const normalizedUser = await userService.promoteToTutor();

            // Store normalized user in context
            setInternalUser(normalizedUser);

            if (normalizedUser.roles.includes("TUTOR")) {
                setActiveRole("TUTOR");
            }

            toast.success("Profil professeur créé avec succès !");
            return true;
        } catch (err) {
            console.error("❌ Promotion échouée :", err);
            toast.error("Erreur lors de la création du profil professeur.");
            return false;
        }
    };

    return {promoteToTutor};
}
// src/hooks/useTutorPromotion.ts
import api from "@/lib/axios";
import {useAuth} from "@/context/AuthContext";
import {toast} from "sonner";
import keycloakSingleton from "@/lib/KeycloakSingleton.ts";

/**
 * Hook that promotes the current user to TUTOR role through the Gateway.
 */
export function useTutorPromotion() {
    const {refreshToken, setActiveRole} = useAuth();

    const promoteToTutor = async () => {
        try {
            // 📨 Call Gateway to add TUTOR role
            await api.post("/api/users/promote-to-tutor");

            // 🔄 Refresh token so Keycloak updates local roles
            await refreshToken();

            const roles = keycloakSingleton.tokenParsed?.realm_access?.roles || [];

            //  Vérifie que le rôle est bien présent
            if (!roles.includes("TUTOR")) {
                toast.warning("Le rôle TUTOR n’est pas encore actif. Réessayez dans quelques secondes.");
                return false;
            }

            // ✅ Update context to reflect the new role
            setActiveRole("TUTOR");

            toast.success("Profil professeur créé avec succès !");
            return true;
        } catch (err) {
            console.error("❌ Promotion échouée :", err);
            toast.error("Impossible de créer votre profil professeur pour le moment.");
            return false;
        }
    };

    return {promoteToTutor};
}

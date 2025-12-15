// src/hooks/useTutorPromotion.ts
import api from "@/lib/axios";
import {useAuth} from "@/context/AuthContext";
import {toast} from "sonner";

/**
 * Hook that promotes the current user to TUTOR role through the Gateway.
 */
export function useTutorPromotion() {
    const {setActiveRole, setInternalUser} = useAuth();

    const promoteToTutor = async () => {
        try {
            // 1) Call backend through Gateway
            const res = await api.post("/api/users/promote-to-tutor", null, {
                withCredentials: true
            });

            if (res.status !== 200) {
                toast.error("Impossible de mettre à jour votre profil.");
                return false;
            }

            toast.success("Profil professeur créé avec succès !");

            // 2) Reload updated internal user
            const userRes = await api.get("/api/users/me", {
                withCredentials: true
            });

            if (!userRes.data || !userRes.data.roles) {
                toast.warning("Profil mis à jour, mais les rôles ne sont pas encore disponibles.");
                return false;
            }

            // 3) Save it into context
            setInternalUser(userRes.data);

            // 4) Set activeRole in AuthContext
            if (userRes.data.roles.includes("TUTOR")) {
                setActiveRole("TUTOR");
            }

            return true;

        } catch (err) {
            console.error("❌ Promotion échouée :", err);
            toast.error("Erreur lors de la création du profil professeur.");
            return false;
        }
    };

    return {promoteToTutor};
}
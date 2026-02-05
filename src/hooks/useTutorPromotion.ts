import api from "@/api/axios.ts";
import {useAuth} from "@/context/AuthContext";
import {toast} from "sonner";


type RoleResponse = { name?: string };

function normalizeRoles(input: unknown): string[] {
    if (!Array.isArray(input)) {
        return [];
    }

    return input
        .map((r: RoleResponse) => (typeof r?.name === "string" ? r.name : null))
        .filter((v): v is string => Boolean(v));
}

/**
 * Hook that promotes the current user to TUTOR role through the Gateway.
 */
export function useTutorPromotion() {
    const {setActiveRole, setInternalUser} = useAuth();

    const promoteToTutor = async () => {
        try {
            const res = await api.post("/users/promote-to-tutor", null, {withCredentials: true});

            if (res.status !== 200) {
                toast.error("Impossible de mettre à jour votre profil.");
                return false;
            }

            // If gateway still returns envelope { created, user }, grab user; else fallback
            const rawUser = res.data?.user ?? res.data;

            const roles = normalizeRoles(rawUser?.roles);
            if (roles.length === 0) {
                toast.warning("Profil mis à jour, mais les rôles ne sont pas disponibles.");
                return false;
            }

            // Store normalized user in context (roles as string[])
            const normalizedUser = {...rawUser, roles};
            setInternalUser(normalizedUser);

            if (roles.includes("TUTOR")) {
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
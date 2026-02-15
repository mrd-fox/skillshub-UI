/**
 * Hook for managing course enrollment
 * Handles enrollment logic, state updates, and error handling
 */

import {useCallback, useState} from "react";
import {toast} from "sonner";
import {userService} from "@/api/services/userService";
import {useAuth} from "@/context/AuthContext";
import {ApiError} from "@/api/axios";

interface UseEnrollmentReturn {
    enroll: (courseId: string) => Promise<void>;
    isEnrolling: boolean;
    enrollingCourseId: string | null;
}

export function useEnrollment(): UseEnrollmentReturn {
    const {setInternalUser} = useAuth();
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

    const enroll = useCallback(
        async (courseId: string): Promise<void> => {
            if (enrollingCourseId === courseId) {
                return;
            }

            setIsEnrolling(true);
            setEnrollingCourseId(courseId);

            try {
                await userService.enrollInCourse(courseId);

                const updatedUser = await userService.getMyProfile();
                setInternalUser(updatedUser);

                toast.success("Cours ajouté à votre liste.");
            } catch (error) {
                const err = error as ApiError;

                if (err.status === 409) {
                    toast.info("Vous êtes déjà inscrit à ce cours.");
                } else if (err.status === 404) {
                    toast.error("Cours introuvable.");
                } else if (err.status >= 500) {
                    toast.error("Service indisponible. Réessayez plus tard.");
                } else {
                    toast.error("Une erreur est survenue. Réessayez plus tard.");
                }

                try {
                    const updatedUser = await userService.getMyProfile();
                    setInternalUser(updatedUser);
                } catch (refetchError) {
                    // Silently log refetch errors to prevent finally block interruption
                    // User state may be temporarily inconsistent but UI remains functional
                    console.warn("Failed to refetch user profile after enrollment error:", refetchError);
                }
            } finally {
                setIsEnrolling(false);
                setEnrollingCourseId(null);
            }
        },
        [enrollingCourseId, setInternalUser]
    );

    return {
        enroll,
        isEnrolling,
        enrollingCourseId,
    };
}

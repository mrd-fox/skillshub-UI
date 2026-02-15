/**
 * Enrollment CTA component
 * Displays an "Add to my list" button for students
 * Handles enrollment state and accessibility
 */

import {useCallback} from "react";
import {Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/context/AuthContext";
import {useEnrollment} from "@/hooks/useEnrollment";

interface EnrollmentCtaProps {
    courseId: string;
    variant?: "card" | "modal";
}

export function EnrollmentCta({courseId, variant = "card"}: Readonly<EnrollmentCtaProps>) {
    const {internalUser} = useAuth();
    const {enroll, isEnrolling, enrollingCourseId} = useEnrollment();

    const handleEnroll = useCallback(() => {
        void enroll(courseId);
    }, [enroll, courseId]);

    if (!internalUser) {
        return null;
    }

    const hasStudentRole = internalUser.roles.includes("STUDENT");
    if (!hasStudentRole) {
        return null;
    }

    const isEnrolled = internalUser.enrolledCourseIds.includes(courseId);
    const isLoadingThisCourse = isEnrolling && enrollingCourseId === courseId;


    if (isEnrolled) {
        return (
            <Button
                type="button"
                variant={variant === "modal" ? "default" : "outline"}
                disabled={true}
                aria-label="Déjà ajouté à votre liste"
            >
                Déjà ajouté
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant={variant === "modal" ? "default" : "outline"}
            onClick={handleEnroll}
            disabled={isLoadingThisCourse}
            aria-busy={isLoadingThisCourse}
            aria-label="Ajouter dans ma liste"
        >
            {isLoadingThisCourse ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true"/>
                    Ajout en cours...
                </>
            ) : (
                "Ajouter dans ma liste"
            )}
        </Button>
    );
}

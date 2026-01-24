import {useCourseBuilder} from "@/layout/tutor/CourseBuilderLayout.tsx";
import CourseSectionsEditor from "@/pages/tutor/course-builder/section/CourseSectionEditor.tsx";

export default function SectionsPage() {
    const {courseId, course, setCourse, refreshCourse} = useCourseBuilder();

    if (!course) {
        return (
            <div className="space-y-3">
                <h1 className="text-2xl font-bold">Sections & chapitres</h1>
                <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Aucun cours chargé.
                </div>
            </div>
        );
    }

    return (
        <CourseSectionsEditor
            courseId={courseId}
            course={course as any}
            setCourse={setCourse as any}
            refreshCourse={refreshCourse}
        />
    );
}
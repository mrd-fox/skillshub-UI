export {default as TutorLayout} from "./TutorLayout";
export {default as TutorSidebar} from "./TutorSidebar";
export {default as TutorHeader} from "./TutorHeader";
// IMPORTANT: explicit .tsx to avoid TS module resolution picking CourseBuilderLayout.ts first
export {default as CourseBuilderLayout} from "./CourseBuilderLayout.tsx";

// Optional: re-export types/helpers from the TS module (safe + useful for imports)
export type {
    ChapterResponse,
    SectionResponse,
    CourseResponse,
    UpdateCourseRequest,
    UpdateSectionRequest,
    UpdateChapterRequest,
    CourseBuilderContextValue,
    CourseMetaSnapshot,
    PublishGate,
} from "./CourseBuilderLayout.ts";

export {
    CourseBuilderContext,
    useCourseBuilder,
    isClientKey,
    getCourseStatusLabel,
    computePublishGate,
    getPublishTooltipText,
    getErrorMessage,
    mapPartialToUpdateRequest,
} from "./CourseBuilderLayout.ts";

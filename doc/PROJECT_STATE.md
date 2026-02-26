# Skillshub UI – Project State (Student Courses & Enrollment)

Last update: 2026-02-19

---

## 1) Context

- Frontend: React (Vite), shadcn/ui, mobile-first.
- Auth: cookies HttpOnly. UI is token-agnostic.
- UI never sends `X-User-*` headers. Gateway injects `X-User-Id` / `X-User-Roles`.
- Backend (modular monolith):
    - User module owns enrollments (`user_course` pivot).
    - Course module exposes:
        - Batch search for enrolled courses (lightweight summaries)
        - Student-only course detail endpoint (full tree + entitlement enforcement)

---

## 2) Functional Goal

Implement the student experience around:

1) Student dashboard = published catalog + enrollment CTA
2) Enrollment button ("Ajouter dans ma liste")
3) Student "My Courses" list based on enrollments
4) Read-only student course viewer (video + sections/chapters)

---

## 3) Backend Contract (Source of Truth)

### A) Profile

GET /api/users/me

Returns:

- enrolledCourseIds: string[] (never null, empty array if none)
- roles: string[]

### B) Enrollment (via Gateway façade)

PUT /api/users/me/enrollments/{courseId}

- Idempotent
- Backend validates role (STUDENT) and creates pivot row if missing
- Returns 204 No Content

### C) Student dashboard catalog (published)

GET /api/public/courses  
GET /api/public/courses/{courseId}

- Public endpoints
- Used for the “catalog-like” dashboard

### D) Batch search for “My Courses” (lightweight)

POST /api/courses/search

Body:
{
"ids": ["uuid1","uuid2"]
}

Returns: CourseSummaryResponse[] (no sections/chapters/videos)

type CourseSummaryResponse = {
id: string;
title: string;
description: string;
status: "PUBLISHED" | string;
createdAt: string;
updatedAt: string;
}

Rules (backend-enforced):

- Entitlement enforced (requested ∩ enrolled)
- Published-only filtering is backend responsibility
- Fail-closed

### E) Student course detail (full tree + entitlement)

GET /api/student/courses/{courseId}

Returns: full CourseResponse with:

- sections[]
- chapters[]
- chapter.video (READY, embedHash, etc.)
- Enrollment required
- Published required
- Role required (STUDENT present in X-User-Roles)

---

## 4) UX Requirements

### A) Student Dashboard = Published Catalog + Enrollment CTA

- Shows all PUBLISHED courses (same UI as public catalog grid).
- Delta vs public home:
    - Add CTA “Ajouter dans ma liste”
    - Button is visible:
        1) On card grid item
        2) In course detail modal footer

Enrollment CTA display rules:

- Only if user is authenticated AND has role STUDENT.
- If already enrolled → disabled state (“Déjà ajouté”).
- On click → call enrollment → refetch /api/users/me for consistency.

Error handling:

- Toast (sonner)
- Always refetch profile after mutation for consistency.

---

### B) Student "My Courses" Page

- Lists enrolled courses only.
- Data flow:
    1) internalUser.enrolledCourseIds
    2) POST /api/courses/search with IDs
    3) Render grid cards

Important:

- UI must NOT filter status === "PUBLISHED".
- UI must NOT rely on tutor endpoints (/course/...).
- Cards follow catalog style.
- If author/price not available in summary response → keep them hidden OR extend backend summary.

Empty state:

- If no enrollments → message + CTA “Parcourir le catalogue” → /dashboard/student

---

### C) Student Course Viewer (Read-Only)

Navigation:

- /dashboard/student/courses/{courseId}

Data:

- Must call GET /api/student/courses/{courseId}
- Never call GET /api/course/{id}

Layout:

- Left: Student sidebar (always visible)
- Center: Video player container (always visible)
- Below video: course general information block
- Right: Collapsible outline sidebar
    - Sections expandable
    - Chapters listed with:
        - index number
        - title
        - video duration (chapter.video.duration)

Initial state:

- On load auto-select:
    - first section by position
    - first chapter by position
- Show skeleton inside player before video loads.
- If no chapters → show empty state.

---

## 5) UI Implementation Plan

### Phase 1 — Types alignment

Add types:

type CourseSummaryResponse = {
id: string;
title: string;
description?: string | null;
status: string;
createdAt?: string | null;
updatedAt?: string | null;
}

type StudentCourseResponse = {
id: string;
title: string;
description?: string | null;
status: string;
sections?: SectionResponse[] | null;
createdAt?: string | null;
updatedAt?: string | null;
}

Update courseService:

- searchCoursesByIds(ids): Promise<CourseSummaryResponse[]>
- getStudentCourse(courseId): Promise<StudentCourseResponse>

---

### Phase 2 — Enrollment CTA

- useEnrollment hook
- enrollInCourse(courseId)
- After success → refetch /api/users/me
- Update CTA state based on enrolledCourseIds

---

### Phase 3 — My Courses page

- Wait for internalUser
- If enrolledCourseIds.length > 0:
    - Call POST /api/courses/search
- Render CourseSummaryResponse[]
- On click → navigate to viewer route

---

### Phase 4 — Student course viewer page

- On mount → getStudentCourse(courseId)
- Build outline from response.sections
- Auto-select first chapter
- Render VimeoPlayer with:
    - sourceUri
    - embedHash
    - thumbnailUrl
- Disable all tutor actions

---

## 6) Non-Goals (current iteration)

- Wishlist
- Tutor editing features in student viewer
- Advanced caching
- Offline support

---

## 7) Acceptance Criteria

1) Student dashboard shows all published courses and exposes “Ajouter dans ma liste”.
2) Enrollment updates /api/users/me and course appears in “My Courses”.
3) “My Courses” renders backend-filtered summaries.
4) Student course viewer uses /api/student/courses/{id}, read-only, auto-selects first chapter.
5) UI never sends X-User-* headers; relies on Gateway injection.

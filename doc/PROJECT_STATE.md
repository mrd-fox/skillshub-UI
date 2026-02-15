# Skillshub UI – Project State (Student Courses & Enrollment)

Last update: 2026-02-15

---

## Context

- Frontend: React (Vite), shadcn/ui, mobile-first.
- Authentication: UI is agnostic of tokens (cookies HttpOnly). All auth flows go through Gateway.
- Gateway injects `X-User-Id` / `X-User-Roles` to backend; UI never sends these headers.
- Backend (modular monolith):
    - User module owns enrollments (`user_course` pivot).
    - Course module provides batch search (`POST /api/courses/search`) with entitlement enforcement.
    - `GET /api/users/me` returns `enrolledCourseIds: string[]` (never null).

---

## Functional Goal

Implement the student experience around:

1) Public published catalog (visible in Student dashboard)
2) Enrollment button ("Add to my courses")
3) "My Courses" list based on enrollments
4) Read-only course viewer for students

---

## UX Requirements

### A) Student Dashboard = Published Catalog + Enrollment CTA

- Student dashboard must show **all courses with status = PUBLISHED**.
- Visual rendering: **same layout and cards as the main catalog page**.
- Delta vs catalog:
    - Add an action button: **"Ajouter dans ma liste"** (enrollment).
    - The button must be visible:
        1) On the course preview card (grid item)
        2) Inside the course modal (details preview)

Enrollment rules:

- Visible only for authenticated users with role `STUDENT`.
- Behavior:
    - Click → call enrollment endpoint (User module).
    - On success → refresh `/api/users/me` OR update local `internalUser.enrolledCourseIds`.
    - Button state changes:
        - If course already enrolled → show disabled state ("Déjà ajouté") or alternative CTA.

Error handling:

- If backend unavailable or returns error → show toast (sonner) + keep UI consistent.

---

### B) "My Courses" Page (Student)

- Must list **enrolled courses only**.
- Data source:
    1) `GET /api/users/me` → `enrolledCourseIds`
    2) `POST /api/courses/search` with these IDs to retrieve course cards

Constraints:

- Only **published** courses are displayed for students.
- No status badge shown (Draft/Published hidden for student).
- Layout: same style as Tutor "My Courses" page cards (example provided), but student-specific content rules.

Empty state:

- If no enrollments → dedicated empty message + link to browse catalog.

---

### C) Student Course Viewer (Read-Only)

- Clicking a course card opens the course viewer page.
- Rendering: same general structure as tutor course view, but:
    - **Read-only** (no edit actions, no upload, no reorder, no save/publish).
    - Course information block (title/description/meta) must be displayed **below the video container**.

Initial navigation behavior:

- The viewer must land directly with **a chapter selected** so that:
    - The video area immediately shows a skeleton/placeholder (visible inside the video rectangle).
- If no chapter exists → show empty state (no video).

Chapter selection:

- Sidebar shows sections/chapters.
- Selecting a chapter loads video viewer for that chapter (read-only).

---

## Technical Contract (Backend)

- `GET /api/users/me` returns:
    - `enrolledCourseIds: string[]` (never null, empty list if none)
- Enrollment endpoint (User module):
    - idempotent insert logic
    - role validation = STUDENT only
- Batch fetch endpoint (Course module):
    - `POST /api/courses/search` with `{ ids: string[] }`
    - Requires authentication (Gateway injects headers)
    - Entitlement enforced: intersection between requested IDs and enrolled IDs
    - Fail-closed: if user enrollment lookup fails → request fails

---

## Implementation Plan (UI)

### Phase 1 — Types + AuthContext alignment

- Extend internal user type to include:
    - `enrolledCourseIds: string[]`
- Ensure hydration guarantees non-null array.

### Phase 2 — Enrollment CTA integration

- Add "Ajouter dans ma liste" button:
    - Course card preview (grid)
    - Course modal
- Provide hook/service:
    - `enrollInCourse(courseId)`
    - updates state via refetch `/api/users/me` (preferred for consistency)

### Phase 3 — Student "My Courses" page

- Fetch user enrollments:
    - `/api/users/me`
- Fetch course details:
    - `POST /api/courses/search`
- Render list with student rules (published only, no status badge)

### Phase 4 — Student course viewer (read-only)

- Create/adjust route for student course viewing.
- Ensure default selected chapter on entry.
- Render info block below video container.
- Disable all tutor-only actions.

---

## Non-Goals (for this iteration)

- Wishlist feature (explicitly separate from enrollment)
- Tutor editing features in student viewer
- Advanced caching of course data
- Offline support

---

## Acceptance Criteria

1) Student dashboard shows all published courses and exposes "Ajouter dans ma liste" in card + modal.
2) Enrolling adds the course to student "My Courses" list.
3) Student "My Courses" lists only enrolled published courses without status labels.
4) Student course viewer is read-only and opens with a selected chapter (video skeleton visible).
5) UI never sends `X-User-*` headers; relies on cookies + Gateway injection.

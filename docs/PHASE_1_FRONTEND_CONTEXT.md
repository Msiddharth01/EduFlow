# 🖥️ Phase 1 Frontend Context: Next.js Setup, Auth UI & Dashboard
**Date:** October 2026  
**Status:** ✅ Build Passes · Ready for Teammate Handoff  
**Framework:** Next.js 16 (App Router) + Tailwind CSS + TypeScript

---

## 1. What Was Built in Phase 1 Frontend

A complete **multi-page Next.js frontend** with:
1. **Premium dark-mode design system** — glassmorphism cards, indigo/purple gradient palette, micro-animations, Inter font.
2. **AuthContext** — React context providing global `user`, `token`, `login`, `register`, and `logout` state, backed by JWT stored in `localStorage`.
3. **Centralized API client** (`lib/api.ts`) — one file for all backend calls, auto-attaching the JWT `Authorization: Bearer <token>` header.
4. **Landing Page** — Hero with feature pills, CTA buttons.
5. **Auth Pages** — Login and Register (with Student/Professor role selector).
6. **Dashboard** — Course grid with counts, Professor "Create Course" modal, Student "Enroll" modal.
7. **Course Detail Page** — Tabbed view of Materials (with processing status badges) and Quizzes.

---

## 2. Frontend File Structure

```text
frontend/
├── app/
│   ├── layout.tsx                        # Root layout, Inter font, wraps AuthProvider
│   ├── globals.css                       # Design system: CSS variables, glassmorphism, badges, buttons
│   ├── page.tsx                          # Landing / Hero page
│   ├── auth/
│   │   ├── login/page.tsx                # Login form (email + password)
│   │   └── register/page.tsx             # Register form with STUDENT/PROFESSOR selector
│   └── dashboard/
│       ├── page.tsx                      # Course grid dashboard
│       └── courses/[courseId]/page.tsx   # Course detail (Materials & Quizzes tabs)
├── context/
│   └── AuthContext.tsx                   # Global auth state management
├── lib/
│   └── api.ts                            # Type-safe API client + all TypeScript interfaces
├── .env.local                            # NEXT_PUBLIC_API_URL=http://localhost:5001/api
├── next.config.ts
└── package.json
```

---

## 3. How to Run the Frontend

```bash
cd frontend
npm install        # already done after scaffold
npm run dev        # Starts at http://localhost:3000
```

**Ensure the backend is running first** (at `http://localhost:5001`), otherwise API calls will fail with "Network error."

---

## 4. Page Routes & What Each Does

| Route | Who Sees It | What It Does |
| :--- | :--- | :--- |
| `/` | Anyone | Landing page with CTA to register/login |
| `/auth/register` | New users | Registration with name, email, password, role selector |
| `/auth/login` | Returning users | Login form, stores JWT token in localStorage |
| `/dashboard` | Logged-in users | Lists all courses; Professor gets "Create Course" button; Student gets "Enroll" button |
| `/dashboard/courses/:id` | Enrolled users | Tabbed Materials + Quizzes view for a specific course |

---

## 5. Key Design Decisions

### CSS Variables (`globals.css`)
All colors are defined as CSS custom properties (`--primary`, `--card`, `--card-border`, etc.) so changing the theme requires editing one file only.

### `AuthContext` Pattern
- On page load, reads `localStorage` for a stored token.
- Calls `GET /api/auth/me` to validate token and restore user state.
- If token is invalid or missing, user state is `null` and protected pages redirect to `/auth/login`.

### `lib/api.ts`
- Every API function is strongly typed with TypeScript generics.
- All shared TypeScript interfaces (`User`, `Course`, `MaterialSummary`, etc.) live here to be reused across all pages and components.
- Returns `{ success: true, data: T } | { success: false, error: string }` — no try/catch needed in UI code.

---

## 6. Teammate Verification Checklist
- [ ] `npm run dev` starts without errors at `http://localhost:3000`.
- [ ] Landing page renders with gradient hero text and feature pills.
- [ ] Register page: toggle between Student and Professor role cards.
- [ ] Register a Professor → redirects to Dashboard showing empty course grid.
- [ ] Professor clicks "New Course" → modal opens → fills code & title → course card appears.
- [ ] Open incognito / new tab → Register as Student → click "Enroll in Course" → enter Professor's course code → card appears.
- [ ] Click a course card → detail page opens with Materials and Quizzes tabs.

---

## 7. What's Next in Phase 2 (Frontend side)
When Phase 2 (PDF Upload) is built on the backend, the frontend additions will be:
- A **file upload dropzone** on the Course Detail page (professor view only).
- A **real-time status poller** showing `⏳ Processing → ✅ Ready` as the ingestion pipeline runs.

# 📘 LearnAI — Architectural Context & Incremental Improvements

> **Phase**: Full System Upgrade & Multi-Feature Integration  
> **Date**: October 2026  
> **Platform**: LearnAI (AI-Powered Personalized Learning Assistant)

---

## 1. Executive Summary of Improvements

We incrementally upgraded LearnAI from an initial minimal MVP to a complete, full-featured academic companion platform across both frontend and backend without breaking any existing models or routes:

1. **Polished Design & Navigation**:
   - Modernized into a deep navy background (`#070b14`), crisp subtle borders (`#1b253b`), and indigo/violet gradients.
   - Built a persistent desktop left-sidebar (`AppLayout.tsx`) with mobile responsive slide-out drawer using `lucide-react`.
   - Polished typography, cards, badges, and layout hierarchy.

2. **Full Student Dashboard**:
   - Welcome banner personalized with the logged-in student's real name.
   - 4 live summary metric cards (Courses Enrolled, Quizzes Attempted, Average Quiz Score %, Topics Needing Revision).
   - Real-time personalized revision recommendations dynamically computed when topics drop below 70% accuracy.
   - Recent learning activity tracking real quiz submissions.
   - Quick action shortcuts: Ask AI Tutor, View Summaries, Practice Quiz, Browse Courses.
   - Polished zero-state / onboarding view explaining how to get started when a student has no enrollments or attempts.

3. **Unified Course Workspace (`/dashboard/courses/[courseId]`)**:
   - Tabbed workspace architecture:
     - **Overview**: Syllabus, metadata, student enrollment info, and AI index status.
     - **Materials**: Lecture PDF catalog with processing badges (`READY`, `PROCESSING`, `FAILED`).
     - **AI Tutor & Split View**: Left pane embeds the PDF document viewer (`iframe` streaming from backend), right pane features the AI Tutor chat.
     - **Summaries**: On-demand generation of Concise, Detailed, or Revision Notes from uploaded lecture PDFs.
     - **Quizzes**: Course-specific MCQ practice tests with retake options and score badges.
     - **Progress**: Course-specific mastery link.

4. **Professor Experience & Material Management**:
   - Course creation with unique code generation (e.g. `CS101`).
   - Drag-and-drop or file selector PDF upload with client and server MIME/size validation.
   - Asynchronous PDF parsing, automatic text chunking (~800 characters with 150 character overlap), and page assignment via `materialController.ts`.
   - Professor quiz builder with multi-question options, answer key selection, and explanation authoring.

5. **AI Tutor RAG Engine & Summarization (`tutorController.ts`)**:
   - Server-side RAG pipeline querying the local Ollama LLM endpoint (`/api/generate`) with system prompt guarding.
   - When Ollama is offline or unavailable, transparently retrieves genuine top-matching document excerpts from the database chunks without fabricating answers.
   - Returns verified citations with Document Title, File Name, Page Number, and exact excerpt snippets.
   - Summary generator supporting 3 distinct formats: Concise (3-bullet executive), Detailed (structured breakdown), and Exam Revision Flash Notes.

6. **Interactive Quiz Engine & Server-Side Scoring (`quizController.ts`)**:
   - Objective questions are scored exclusively on the backend (`POST /api/quizzes/:id/submit`). Correct answer indices are hidden from the student until submission.
   - Saves `QuizAttempt` and `AttemptAnswer` records in PostgreSQL.
   - Calculates real topic-level accuracy and identifies weak areas (<70%).

7. **Progress & Learning Analytics (`/dashboard/progress`)**:
   - Historical attempt logs with dates, scores, and percentage badges.
   - Topic Mastery Progress bars computed from database attempt records.
   - Direct links from weak topics into the AI Tutor for clarification.

---

## 2. Updated API Endpoints Reference

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/me` | Authenticated | Retrieves quizzes attempted, average score, weak topics, and recommendations |
| `POST` | `/api/courses/:courseId/materials` | Professor / Admin | Uploads PDF material, extracts text, and stores document chunks |
| `GET` | `/api/materials/:materialId/file` | Enrolled / Admin | Authenticated PDF file streaming for the browser viewer |
| `POST` | `/api/courses/:courseId/tutor` | Enrolled | AI Tutor Q&A grounded in course material chunks with page citations |
| `POST` | `/api/courses/:courseId/summaries` | Enrolled | Generates concise, detailed, or flash revision summaries |
| `GET` | `/api/courses/:courseId/quizzes` | Enrolled | Lists quizzes and latest user attempt scores |
| `GET` | `/api/quizzes/:quizId` | Enrolled | Gets quiz questions for student taking (hides answers) |
| `POST` | `/api/quizzes/:quizId/submit` | Enrolled | Evaluates answers on the server, calculates score, and saves attempt |
| `POST` | `/api/courses/:courseId/quizzes` | Professor / Admin | Authors a new quiz with questions, options, and explanations |

---

## 3. Technology Stack Verification

- **Backend**: Express + TypeScript + Prisma ORM + PostgreSQL (`pgvector`) + `pdf-parse` + `multer`.
- **Frontend**: Next.js 16 (App Router) + React 19 + Turbopack + Tailwind CSS + `lucide-react`.
- **Database**: PostgreSQL 16 with `pgvector` container `learning_assistant_db`.

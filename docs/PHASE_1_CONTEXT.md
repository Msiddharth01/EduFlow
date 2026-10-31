# 🛡️ Phase 1 Context: Foundation, Database (pgvector) & RBAC Authentication
**Date:** October 2026  
**Status:** Complete & Ready for Teammate Handoff  
**Branch / Folder:** `backend/`

---

## 1. What Was Built in Phase 1
In Phase 1, we constructed the core backend engine that underpins the entire learning platform:
1. **Node.js + Express + TypeScript** server architecture using strict MVC/Controller-Service layers.
2. **PostgreSQL Database Schema via Prisma ORM** with native `pgvector` extension enabled for storing 768-dimensional AI embeddings alongside relational data.
3. **Role-Based Access Control (RBAC):**
   - Distinct roles: `STUDENT`, `PROFESSOR`, `ADMIN`.
   - Secure password hashing with `bcryptjs`.
   - Stateless session management with signed JSON Web Tokens (JWT).
   - Middleware protection: `authenticateToken` and `requireRole([Role.PROFESSOR])`.
4. **Course Management & Enrollment Engine:**
   - Professors can create courses with unique course codes (e.g., `CS401`).
   - Students can discover and enroll in courses using course codes.
   - Strict data isolation: students can only access materials and quizzes for courses they are enrolled in.
5. **Unified Local Database Container:** `docker-compose.yml` preconfigured with `pgvector/pgvector:pg16`.

---

## 2. Entity-Relationship (ER) Schema Overview

```
User (id, email, passwordHash, name, role)
 │
 ├── 1:N ── Enrollment ── N:1 ── Course (id, code, title, description)
 │                                  │
 ├── 1:N ── Material ───────────────┤ (id, title, fileName, filePath, status)
 │             │                    │
 │             └── 1:N ── DocumentChunk (id, content, pageNumber, embedding[768])
 │                                  │
 └── 1:N ── QuizAttempt             ├── 1:N ── Quiz (id, title, topic)
               │                                  │
               └── 1:N ── AttemptAnswer           └── 1:N ── Question (id, text, options, correctIndex)
```

---

## 3. How to Run Phase 1 on Your Laptop

### Step 1: Install Dependencies
Open your terminal in the backend directory:
```bash
cd backend
npm install
```

### Step 2: Start the Vector Database
From the project root:
```bash
docker compose up -d postgres
```
*(If Docker Desktop is running, this launches PostgreSQL 16 on port 5432 with pgvector pre-installed).*

### Step 3: Run Prisma Database Migrations
In the `backend` directory:
```bash
npx prisma generate
npx prisma migrate dev --name init_capstone_schema
```
*(Optional: Run `npx prisma studio` to view a web interface of your database at http://localhost:5555).*

### Step 4: Start the Development Server
```bash
npm run dev
```
The server will start at **http://localhost:5001**.  
Health check: `curl http://localhost:5001/api/health`

---

## 4. API Endpoints Specification

### 4.1 Authentication Endpoints

#### `POST /api/auth/register`
Creates a new student or professor account.
- **Request Body:**
  ```json
  {
    "name": "Prof. Alan Turing",
    "email": "turing@university.edu",
    "password": "securepassword123",
    "role": "PROFESSOR" // or "STUDENT"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Account created successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "c1f7b8...",
      "email": "turing@university.edu",
      "name": "Prof. Alan Turing",
      "role": "PROFESSOR"
    }
  }
  ```

#### `POST /api/auth/login`
Authenticates user and returns JWT token.
- **Request Body:**
  ```json
  {
    "email": "turing@university.edu",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK):** Returns JWT token and user profile.

#### `GET /api/auth/me`
Fetches current logged-in user profile and course memberships.
- **Header:** `Authorization: Bearer <TOKEN>`

---

### 4.2 Course & Enrollment Endpoints

#### `POST /api/courses`
Creates a new course (Restricted: **Professors only**).
- **Header:** `Authorization: Bearer <PROFESSOR_TOKEN>`
- **Request Body:**
  ```json
  {
    "code": "CS301",
    "title": "Operating Systems & Concurrency",
    "description": "Processes, Threads, Semaphores, and Deadlocks"
  }
  ```
- **Response (201 Created):** Returns created course with creator auto-enrolled as instructor.

#### `POST /api/courses/enroll`
Enrolls a student into a course using its code.
- **Header:** `Authorization: Bearer <STUDENT_TOKEN>`
- **Request Body:**
  ```json
  {
    "courseCode": "CS301"
  }
  ```
- **Response (201 Created):** Enrolls student in the course.

#### `GET /api/courses`
Lists all courses the authenticated user is enrolled in or teaching.
- **Header:** `Authorization: Bearer <TOKEN>`

#### `GET /api/courses/:courseId`
Returns complete course view (syllabus, uploaded materials, and generated quizzes). Returns `403 Forbidden` if student is not enrolled.
- **Header:** `Authorization: Bearer <TOKEN>`

---

## 5. Teammate Verification Checklist
- [ ] Run `npm install` in `/backend` without errors.
- [ ] Launch `docker compose up -d postgres`.
- [ ] Run `npx prisma migrate dev` to generate tables.
- [ ] Register a Professor user and obtain a JWT.
- [ ] Register a Student user and obtain a separate JWT.
- [ ] Attempt to create a course using the Student token (verify it returns `403 Forbidden`).
- [ ] Create the course with the Professor token (verify success `201 Created`).
- [ ] Enroll the Student using the course code.

---

## 6. What's Next in Phase 2
In **Phase 2**, we will connect the PDF upload pipeline:
- Multer file ingestion on `POST /api/materials/upload/:courseId`.
- Automated text extraction preserving page indices.
- Recursive chunking and Ollama vector generation.

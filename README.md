# 🎓 AI-Powered Personalized Learning Assistant (Capstone Project)

A university capstone project building a course-aware AI learning companion with **Retrieval-Augmented Generation (RAG)**, local AI models (**Ollama**), vector similarity search (**PostgreSQL + pgvector**), structured multiple-choice quiz generation, and adaptive topic revision.

---

## 📁 Repository Structure

```text
├── docs/
│   ├── PHASE_0_CONTEXT.md       # Phase 0: Hardware spike, Ollama setup & benchmarking
│   └── PHASE_1_CONTEXT.md       # Phase 1: Backend architecture, DB schema & Auth API
├── scripts/
│   └── spike_test.js            # Standalone benchmark script for local AI setup
├── backend/                     # Node.js + Express + TypeScript + Prisma Backend
│   ├── prisma/
│   │   └── schema.prisma        # Database models + pgvector vector(768) definition
│   ├── src/
│   │   ├── config/              # Database & Ollama client singletons
│   │   ├── controllers/         # Auth & Course controllers
│   │   ├── middleware/          # JWT verification & RBAC guards
│   │   ├── routes/              # Express API route declarations
│   │   ├── app.ts               # Express application configuration
│   │   └── server.ts            # Server bootstrap
│   ├── .env.example             # Environment variable template
│   └── package.json
├── docker-compose.yml           # Pre-configured PostgreSQL 16 + pgvector container
└── README.md
```

---

## ⚡ Quick Start for Team Members

### 1. Verify Local AI Environment (Phase 0)
Make sure Ollama is installed and running:
```bash
ollama serve
ollama pull nomic-embed-text
ollama pull llama3.2:3b
node scripts/spike_test.js
```
*Read full details in [docs/PHASE_0_CONTEXT.md](file:///docs/PHASE_0_CONTEXT.md).*

### 2. Start PostgreSQL with pgvector
```bash
docker compose up -d postgres
```

### 3. Setup and Start Backend (Phase 1)
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init_schema
npm run dev
```
*Read API endpoints and testing guide in [docs/PHASE_1_CONTEXT.md](file:///docs/PHASE_1_CONTEXT.md).*

---

## 🗺️ Project Phases Overview
- [x] **Phase 0:** Hardware Spike & AI Infrastructure Verification
- [x] **Phase 1:** Backend Foundation, PostgreSQL (pgvector) & RBAC Authentication
- [ ] **Phase 2:** PDF Ingestion, Text/Page Extraction, Chunking & Embedding Pipeline
- [ ] **Phase 3:** Grounded Course RAG Chat with Streaming (SSE)
- [ ] **Phase 4:** Structured MCQ Generation & Deterministic Grading
- [ ] **Phase 5:** Student Topic Mastery & Weakness Revision Engine
- [ ] **Phase 6:** Next.js Modern UI with Split-Screen PDF Viewer
- [ ] **Phase 7:** Evaluation, Latency Benchmarking & Final Capstone Viva Prep

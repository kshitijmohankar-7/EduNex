# EduNex — AI-Powered College Management & Student Success Platform

A starter, working scaffold for the EduNex platform: student/faculty/admin portals,
a Node/Express + PostgreSQL REST API, and a Python/FastAPI AI microservice with a
RAG pipeline over study materials.

This is a **functional foundation**, not the finished product — every module described
in the original brief has a real file and a working code path, but content upload
handling (multer/S3), the admin CRUD screens, and the LLM API call itself are left as
clearly marked integration points so you can plug in your own credentials and storage.

## What's included

```
edunex/
├── client/         React 18 + Vite frontend (student/faculty/admin dashboards, AI chat)
├── server/         Express REST API (auth, students, faculty, materials, attendance, marks)
├── database/       PostgreSQL schema.sql + seed.sql
├── ai-service/     FastAPI service: chat routing, RAG over materials, performance insights
└── uploads/        Local file storage for notes/assignments/question banks/certificates
```

## Quick start

### 1. Database
```bash
createdb edunex
psql edunex < database/schema.sql
psql edunex < database/seed.sql   # optional demo data
```

### 2. Backend API
```bash
cd server
cp .env.example .env      # fill in DATABASE_URL and JWT_SECRET
npm install
npm run dev                # http://localhost:5000
```

### 3. AI service
```bash
cd ai-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

The frontend currently runs against **mock data** (`client/src/mock/mockData.js`) so
you can explore every screen immediately with `npm run dev` alone — no backend
required. Login accepts any password in demo mode; switch roles with the toggle
on the login screen. Once your API is running, swap the calls in `AuthContext.jsx`
and the page components for the real `services/api.js` methods.

## Wiring up the LLM

`ai-service/main.py` and `ai-service/rag.py` mark the exact spot to add a real LLM
call (`call_llm(prompt)`), e.g. via the Anthropic API. The RAG pipeline (chunking →
embeddings → Chroma vector store → retrieval) already runs locally with
`sentence-transformers`, so you only need to add the generation step.

## Security model

- JWT auth (`server/middleware/auth.js`) + role-based authorization
  (`server/middleware/roleCheck.js`) gate every route.
- Students can only ever read their **own** row, resolved server-side from the JWT —
  there's no student ID parameter a client could tamper with.
- Faculty writes (attendance, marks, materials) are checked against
  `faculty_subject_assignments` before anything is saved — a faculty member can't
  touch a subject they aren't assigned to.
- Marks are entered as **unpublished drafts** and only become visible to students
  after an explicit `POST /api/faculty/marks/publish` call.
- The AI service never queries the database directly — `server/controllers/aiController.js`
  builds an "authorized context" object scoped to the requesting user and forwards
  only that, so the AI can't leak another student's data even if asked to.

## Next steps to reach a production-ready build

1. Add the admin CRUD routes/controllers (departments, courses, faculty assignment).
2. Add file upload handling with `multer` + real storage (S3/Cloudinary) instead of local `uploads/`.
3. Add a `POST /api/students/achievements/:id/certificate` upload flow.
4. Add automated marksheet/SGPA calculation (trigger or scheduled job) once end-sem marks are published.
5. Add tests (Jest/Supertest for the API, Vitest for the client).
6. Replace `AuthContext`'s demo login with real `api.login()` + token storage.

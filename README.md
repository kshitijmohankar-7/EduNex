# EduNex — AI-Powered College Management & Student Success Platform

EduNex is a full-stack college management and student-success platform for **students, faculty and administrators**, combining PostgreSQL-backed academic workflows with a Gemini/RAG AI assistant.

## Stack

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL 18
- **AI service:** Python + FastAPI
- **AI:** Gemini + Chroma RAG over study materials
- **Uploads:** local filesystem with legacy-path compatibility

## Implemented phases

### Phase 1 — Core academic management

- Admin-only student/faculty account creation
- Department, course, semester, division and subject CRUD
- Faculty-to-subject assignment authorization
- Attendance management
- CT1, CT2, Internal, External and End-Semester marks
- Explicit mark publishing
- SGPA/CGPA calculation
- Marksheet upload/publishing
- Assignments, submissions, approval/rejection and grading/feedback
- Question-bank upload and student access
- Achievements/certificates
- Announcements
- Role-based navigation and protected APIs

### Phase 2 — AI + student success

- Database-direct AI lookups for common academic questions
- Gemini/RAG fallback for conceptual questions
- RAG source cards in AI Chat
- Chroma indexing dashboard with re-index support
- Automatic study-material indexing
- Student/faculty/admin notifications
- AI Academic Insights
- Attendance/performance/assignment recommendations

### Phase 3 — Analytics + reliability

- Student Analytics dashboard
- Faculty Analytics dashboard
- Admin Analytics and recent audit dashboard
- Performance/data-integrity indexes
- Elective-aware analytics and academic calculations
- Legacy upload-path normalization
- Assignment submission file compatibility
- Faculty subject authorization hardening
- Approved elective visibility in marks, assignments, materials and question banks
- Defensive analytics rendering so empty datasets do not crash the UI

## Quick start

### 1. Database

Run the base schema/seed only for a new installation. For an existing EduNex installation, run the migrations in order that have not already been applied.

**Phase 1:**
```powershell
psql -U postgres -d edunex -f database\migrations\2026-09-11-phase1-admin-questionbank-grading.sql
```

**Phase 2:**
```powershell
psql -U postgres -d edunex -f database\migrations\2026-09-12-phase2.sql
```

**Phase 3:**
```powershell
psql -U postgres -d edunex -f database\migrations\2026-09-14-phase3.sql
```

If PostgreSQL is not on PATH on Windows:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d edunex -f database\migrations\2026-09-14-phase3.sql
```

### 2. Backend

```powershell
cd server
npm install
npm run dev
```

API: `http://localhost:5000`

Health check:
```text
GET /api/health
```

### 3. AI service

```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

AI service: `http://localhost:8000`

### 4. Frontend

```powershell
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## AI/RAG

The AI service supports:

1. PDF/DOCX study-material extraction
2. Chunking and Gemini embeddings
3. Persistent Chroma vector storage
4. Retrieved-source context for grounded responses
5. Database-direct answers for common academic queries
6. Re-indexing and indexing diagnostics

Common dashboard path:

**Faculty → Menu → RAG Indexing**

## File handling

EduNex stores uploaded files under:

```text
uploads/
├── assignments/
├── assignment-submissions/
├── study-material/
├── question-banks/
├── marksheets/
└── achievements/
```

The API normalizes older absolute Windows paths such as `D:/.../uploads/...` before returning public URLs, so previously uploaded files do not need to be re-uploaded.

## Security model

- JWT authentication and role-based authorization protect APIs.
- Students can only access their own academic records.
- Faculty writes are restricted to assigned subjects.
- Faculty assignment/submission/material/question-bank access is scoped to ownership or assigned subjects.
- Approved Open Electives and Liberal Learning subjects are included wherever student academic access is required.
- Marks remain unpublished until explicitly published; editing an already published mark does not silently unpublish it.
- AI requests receive authorized user context rather than unrestricted database access.

## Current status

EduNex is now beyond the initial scaffold: **Phase 1, Phase 2 and Phase 3 feature work is implemented on `main`**, with additional reliability/security fixes for the regressions found during end-to-end testing.

Before testing after a pull, restart the backend and frontend so Vite/Node are not serving stale source files.

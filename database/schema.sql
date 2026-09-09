-- ============================================================
-- EduNex Database Schema (PostgreSQL)
-- ============================================================

CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin');

-- ---------- Core identity ----------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ---------- College structure ----------
CREATE TABLE departments (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(150) NOT NULL,
    code    VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE courses (
    id              SERIAL PRIMARY KEY,
    department_id   INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    duration_years  INTEGER NOT NULL
);

CREATE TABLE academic_years (
    id      SERIAL PRIMARY KEY,
    label   VARCHAR(20) NOT NULL
);

CREATE TABLE semesters (
    id          SERIAL PRIMARY KEY,
    course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    number      INTEGER NOT NULL
);

CREATE TABLE divisions (
    id          SERIAL PRIMARY KEY,
    semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
    name        VARCHAR(10) NOT NULL
);

CREATE TABLE subjects (
    id              SERIAL PRIMARY KEY,
    semester_id     INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    code            VARCHAR(20) NOT NULL,
    credits         INTEGER DEFAULT 3
);

-- ---------- People ----------
CREATE TABLE students (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_code        VARCHAR(30) UNIQUE NOT NULL,
    department_id       INTEGER REFERENCES departments(id),
    course_id           INTEGER REFERENCES courses(id),
    current_semester_id INTEGER REFERENCES semesters(id),
    division_id         INTEGER REFERENCES divisions(id),
    academic_year_id    INTEGER REFERENCES academic_years(id)
);

CREATE TABLE faculty (
    id              SERIAL PRIMARY KEY,
    user_id          INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    faculty_code     VARCHAR(30) UNIQUE NOT NULL,
    department_id    INTEGER REFERENCES departments(id)
);

CREATE TABLE faculty_subject_assignments (
    id          SERIAL PRIMARY KEY,
    faculty_id  INTEGER REFERENCES faculty(id) ON DELETE CASCADE,
    subject_id  INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    division_id INTEGER REFERENCES divisions(id) ON DELETE CASCADE
);

-- ---------- Attendance ----------
CREATE TABLE attendance (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
    subject_id  INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    class_date  DATE NOT NULL,
    status      VARCHAR(10) CHECK (status IN ('present', 'absent')) NOT NULL,
    marked_by   INTEGER REFERENCES faculty(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, class_date)
);

-- ---------- Marks ----------
CREATE TABLE marks (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    exam_type       VARCHAR(20) CHECK (exam_type IN ('CT1','CT2','INTERNAL','EXTERNAL','END SEMESTER')) NOT NULL,
    max_marks       NUMERIC(5,2) NOT NULL,
    obtained_marks  NUMERIC(5,2) NOT NULL,
    grade           VARCHAR(5),
    entered_by      INTEGER REFERENCES faculty(id),
    published       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, exam_type)
);

-- ---------- Marksheet ----------
CREATE TABLE marksheets (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
    semester_id     INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
    sgpa            NUMERIC(4,2),
    cgpa            NUMERIC(4,2),
    result_status   VARCHAR(20),
    file_path       VARCHAR(500),
    file_name       VARCHAR(255),
    file_type       VARCHAR(100),
    uploaded_by     INTEGER REFERENCES faculty(id),
    published_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, semester_id)
);

-- ---------- Study materials ----------
CREATE TABLE materials (
    id          SERIAL PRIMARY KEY,
    subject_id  INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    unit        VARCHAR(50),
    file_path   VARCHAR(500) NOT NULL,
    file_type   VARCHAR(20),
    uploaded_by INTEGER REFERENCES faculty(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ---------- Assignments ----------
CREATE TABLE assignments (
    id              SERIAL PRIMARY KEY,
    subject_id      INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    instructions    TEXT,
    file_path       VARCHAR(500),
    issue_date      DATE,
    deadline        DATE,
    uploaded_by     INTEGER REFERENCES faculty(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
    id              SERIAL PRIMARY KEY,
    assignment_id   INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
    file_path       VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'pending',
    marks_obtained  NUMERIC(5,2),
    submitted_at    TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- ---------- Question banks ----------
CREATE TABLE question_banks (
    id          SERIAL PRIMARY KEY,
    subject_id  INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    unit        VARCHAR(50),
    title       VARCHAR(200) NOT NULL,
    file_path   VARCHAR(500) NOT NULL,
    uploaded_by INTEGER REFERENCES faculty(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ---------- Achievements ----------
CREATE TABLE achievements (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    organization    VARCHAR(200),
    achieved_on     DATE,
    certificate_path VARCHAR(500),
    skills          TEXT[],
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ---------- Announcements ----------
CREATE TABLE announcements (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    body            TEXT NOT NULL,
    department_id   INTEGER REFERENCES departments(id),
    posted_by       INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ---------- Audit log ----------
CREATE TABLE audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    action      VARCHAR(200) NOT NULL,
    entity      VARCHAR(100),
    entity_id   INTEGER,
    details     JSONB,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ---------- Indexes ----------
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_subject ON attendance(subject_id);
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_materials_subject ON materials(subject_id);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);

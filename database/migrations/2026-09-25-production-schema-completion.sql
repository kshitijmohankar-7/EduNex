-- Production schema completion for fields/tables used by the current application.
BEGIN;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_category VARCHAR(50);

CREATE TABLE IF NOT EXISTS student_subjects (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_student_subjects_student_status ON student_subjects(student_id,status,subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject_status ON student_subjects(subject_id,status,student_id);

CREATE TABLE IF NOT EXISTS subject_choices (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  open_elective_subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  lll_subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subject_choices_student_status ON subject_choices(student_id,status,open_elective_subject_id,lll_subject_id);

COMMIT;

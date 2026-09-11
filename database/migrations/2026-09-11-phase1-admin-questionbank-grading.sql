BEGIN;

ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT;

CREATE INDEX IF NOT EXISTS idx_question_banks_subject ON question_banks(subject_id);
CREATE INDEX IF NOT EXISTS idx_question_banks_uploaded_by ON question_banks(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

COMMIT;

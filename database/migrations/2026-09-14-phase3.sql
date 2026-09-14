BEGIN;

CREATE INDEX IF NOT EXISTS idx_fsa_faculty_subject ON faculty_subject_assignments(faculty_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_fsa_subject_faculty ON faculty_subject_assignments(subject_id, faculty_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_student_status ON student_subjects(student_id, status, subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject_status ON student_subjects(subject_id, status, student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_uploaded_by ON assignments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_status ON assignment_submissions(assignment_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_marks_student_published ON marks(student_id, published, subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marks_subject_published ON marks(subject_id, published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_subject_date ON attendance(student_id, subject_id, class_date DESC);
CREATE INDEX IF NOT EXISTS idx_marksheets_student_published ON marksheets(student_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_banks_subject_uploaded ON question_banks(subject_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC, id DESC);

COMMIT;

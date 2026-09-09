BEGIN;

-- Remove the demo CT2 records currently present for the demo student.
-- Future CT2 marks entered by faculty are unaffected after this migration.
DELETE FROM marks
WHERE exam_type = 'CT2'
  AND student_id IN (
    SELECT id FROM students WHERE student_code = 'CSE2025001'
  );

ALTER TABLE marksheets
  ADD COLUMN IF NOT EXISTS file_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES faculty(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

COMMIT;

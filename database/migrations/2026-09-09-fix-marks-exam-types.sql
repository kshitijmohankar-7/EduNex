-- EduNex marks exam-type migration
-- Run this once against an EXISTING database.
-- It keeps existing marks and converts the old exam labels to the new UI labels.

BEGIN;

-- Convert legacy values used by the original schema/application.
UPDATE marks
SET exam_type = CASE LOWER(TRIM(exam_type))
  WHEN 'ct1' THEN 'CT1'
  WHEN 'ct2' THEN 'CT2'
  WHEN 'class_assessment' THEN 'INTERNAL'
  WHEN 'internal' THEN 'INTERNAL'
  WHEN 'external' THEN 'EXTERNAL'
  WHEN 'end_sem' THEN 'END SEMESTER'
  WHEN 'end semester' THEN 'END SEMESTER'
  ELSE exam_type
END;

-- Replace the original constraint, which did not allow EXTERNAL or END SEMESTER.
ALTER TABLE marks
DROP CONSTRAINT IF EXISTS marks_exam_type_check;

ALTER TABLE marks
ADD CONSTRAINT marks_exam_type_check
CHECK (exam_type IN ('CT1', 'CT2', 'INTERNAL', 'EXTERNAL', 'END SEMESTER'));

COMMIT;

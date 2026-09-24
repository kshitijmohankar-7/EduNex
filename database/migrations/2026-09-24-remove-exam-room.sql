-- Remove the room/hall field from the exam schedule.
-- Safe for databases where the campus-services migration has already been applied.
ALTER TABLE exam_schedules DROP COLUMN IF EXISTS room;

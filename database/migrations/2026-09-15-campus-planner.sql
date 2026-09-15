BEGIN;

CREATE TABLE IF NOT EXISTS timetable_entries (
  id SERIAL PRIMARY KEY,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  division_id INTEGER REFERENCES divisions(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(80),
  class_type VARCHAR(30) NOT NULL DEFAULT 'Lecture',
  notes VARCHAR(300),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_timetable_semester_day ON timetable_entries(semester_id,division_id,day_of_week,start_time);
CREATE INDEX IF NOT EXISTS idx_timetable_subject ON timetable_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON timetable_entries(faculty_id);

CREATE OR REPLACE FUNCTION set_timetable_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at=NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_timetable_updated_at ON timetable_entries;
CREATE TRIGGER trg_timetable_updated_at BEFORE UPDATE ON timetable_entries FOR EACH ROW EXECUTE FUNCTION set_timetable_updated_at();

COMMIT;

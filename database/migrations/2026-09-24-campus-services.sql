-- EduNex campus services: persistent feedback and admin-managed exam schedule
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS exam_schedules (
  id BIGSERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_type VARCHAR(30) NOT NULL DEFAULT 'END SEMESTER',
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  instructions TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (end_time IS NULL OR end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_date ON exam_schedules(exam_date, start_time);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_subject ON exam_schedules(subject_id);
